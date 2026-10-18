package com.algolens.tracer;

import com.sun.jdi.*;
import com.sun.jdi.connect.Connector;
import com.sun.jdi.connect.LaunchingConnector;
import com.sun.jdi.event.*;
import com.sun.jdi.request.*;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * AlgoLens Java Debugger Tracer
 * ============================================================================
 * Uses the standard Java Debug Interface (JDI / jdk.jdi) to launch and trace
 * target Java programs step-by-step. Records executed source lines, stack frames,
 * local variables, arrays, return values, and exceptions into a bounded JSON trace.
 */
public class JavaTracer {
    private static final int DEFAULT_MAX_STEPS = 500;
    private static final int HARD_MAX_STEPS = 500;
    private static final int MAX_COLLECTION_ELEMENTS = 50;
    private static final int MAX_STRING_LENGTH = 256;
    private static final int MAX_STACK_DEPTH = 15;
    private static final int MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB limit for stdout/stderr

    public static void main(String[] args) {
        String classPath = ".";
        String mainClass = "Solution";
        int maxSteps = DEFAULT_MAX_STEPS;

        for (int i = 0; i < args.length; i++) {
            if ("-cp".equals(args[i]) && i + 1 < args.length) {
                classPath = args[++i];
            } else if ("-main".equals(args[i]) && i + 1 < args.length) {
                mainClass = args[++i];
            } else if ("-maxSteps".equals(args[i]) && i + 1 < args.length) {
                try {
                    maxSteps = Integer.parseInt(args[++i]);
                } catch (NumberFormatException ignored) {}
            }
        }

        // Enforce hard ceiling on maxSteps
        maxSteps = Math.min(Math.max(1, maxSteps), HARD_MAX_STEPS);

        JavaTracer tracer = new JavaTracer(classPath, mainClass, maxSteps);
        tracer.run();
    }

    private final String classPath;
    private final String mainClass;
    private final int maxSteps;
    private final List<Map<String, Object>> events = new ArrayList<>();
    private final StringBuilder targetStdout = new StringBuilder();
    private final StringBuilder targetStderr = new StringBuilder();
    private boolean truncated = false;
    private String executionError = null;
    private int seq = 0;

    public JavaTracer(String classPath, String mainClass, int maxSteps) {
        this.classPath = classPath;
        this.mainClass = mainClass;
        this.maxSteps = maxSteps;
    }

    public void run() {
        VirtualMachine vm = null;
        try {
            LaunchingConnector connector = findLaunchingConnector();
            if (connector == null) {
                emitError("Could not find standard JDI CommandLineLaunch connector.");
                return;
            }

            Map<String, Connector.Argument> arguments = connector.defaultArguments();
            Connector.Argument mainArg = arguments.get("main");
            if (mainArg == null) {
                emitError("Connector is missing 'main' launch argument.");
                return;
            }
            mainArg.setValue("-cp \"" + classPath + "\" " + mainClass);

            Connector.Argument optionsArg = arguments.get("options");
            if (optionsArg != null) {
                optionsArg.setValue("-Xmx64m -XX:+UseSerialGC -XX:MaxRAM=128m -Dfile.encoding=UTF-8");
            }

            vm = connector.launch(arguments);
            Process process = vm.process();

            // Asynchronously capture child process stdout and stderr
            Thread stdoutReader = startStreamReader(process.getInputStream(), targetStdout);
            Thread stderrReader = startStreamReader(process.getErrorStream(), targetStderr);

            EventRequestManager erm = vm.eventRequestManager();

            // Listen for user class prepare to register stepping
            ClassPrepareRequest cpr = erm.createClassPrepareRequest();
            cpr.addClassFilter(mainClass + "*");
            cpr.enable();

            // Listen for uncaught exceptions
            ExceptionRequest er = erm.createExceptionRequest(null, false, true);
            er.addClassFilter(mainClass + "*");
            er.enable();

            EventQueue queue = vm.eventQueue();
            boolean connected = true;

            while (connected) {
                EventSet eventSet = queue.remove(2000); // 2 second timeout check
                if (eventSet == null) {
                    // Check if target process has terminated
                    if (!process.isAlive()) {
                        break;
                    }
                    continue;
                }

                for (Event event : eventSet) {
                    if (event instanceof VMDisconnectEvent || event instanceof VMDeathEvent) {
                        connected = false;
                        break;
                    }

                    if (event instanceof ClassPrepareEvent) {
                        ClassPrepareEvent cpe = (ClassPrepareEvent) event;
                        ReferenceType refType = cpe.referenceType();
                        if (refType.name().startsWith(mainClass)) {
                            registerStepping(erm, cpe.thread());
                        }
                    } else if (event instanceof StepEvent) {
                        handleStepEvent((StepEvent) event);
                        if (events.size() >= maxSteps) {
                            truncated = true;
                            connected = false;
                            break;
                        }
                    } else if (event instanceof MethodExitEvent) {
                        handleMethodExitEvent((MethodExitEvent) event);
                    } else if (event instanceof ExceptionEvent) {
                        handleExceptionEvent((ExceptionEvent) event);
                    }
                }

                if (connected) {
                    eventSet.resume();
                }
            }

            try {
                if (vm != null) vm.exit(0);
            } catch (Exception ignored) {}

            try {
                if (process.isAlive()) {
                    process.destroyForcibly();
                }
            } catch (Exception ignored) {}

            stdoutReader.join(1000);
            stderrReader.join(1000);

            emitResult();
        } catch (Exception e) {
            this.executionError = e.getMessage() != null ? e.getMessage() : e.toString();
            emitResult();
        }
    }

    private void registerStepping(EventRequestManager erm, ThreadReference thread) {
        // Step line by line within user classes
        StepRequest sr = erm.createStepRequest(thread, StepRequest.STEP_LINE, StepRequest.STEP_INTO);
        sr.addClassFilter(mainClass + "*");
        sr.setSuspendPolicy(EventRequest.SUSPEND_ALL);
        sr.enable();

        // Method exit request to record function return values
        MethodExitRequest mer = erm.createMethodExitRequest();
        mer.addClassFilter(mainClass + "*");
        mer.setSuspendPolicy(EventRequest.SUSPEND_ALL);
        mer.enable();
    }

    private void captureFramesAndLocals(ThreadReference thread, Map<String, Object> eventMap) {
        List<Map<String, Object>> framesList = new ArrayList<>();
        Map<String, Object> variablesMap = new LinkedHashMap<>();

        try {
            List<StackFrame> frames = thread.frames();
            for (int i = 0; i < Math.min(frames.size(), MAX_STACK_DEPTH); i++) {
                StackFrame f = frames.get(i);
                Location fLoc = f.location();
                if (fLoc.declaringType().name().startsWith(mainClass)) {
                    Map<String, Object> fMap = new LinkedHashMap<>();
                    fMap.put("depth", i);
                    fMap.put("functionName", fLoc.method().name());
                    fMap.put("fileName", fLoc.sourceName());
                    fMap.put("line", fLoc.lineNumber());
                    framesList.add(fMap);
                }
            }

            if (!frames.isEmpty()) {
                StackFrame top = frames.get(0);
                List<LocalVariable> visible = top.visibleVariables();
                for (LocalVariable var : visible) {
                    Value val = top.getValue(var);
                    variablesMap.put(var.name(), serializeValue(var.name(), var.typeName(), val, 0));
                }
            }
        } catch (Exception ignored) {}

        eventMap.put("stackFrames", framesList);
        eventMap.put("variables", variablesMap);
    }

    private void handleStepEvent(StepEvent event) {
        Location loc = event.location();
        if (loc.lineNumber() <= 0) return; // Skip synthesized/unknown lines

        Map<String, Object> eventMap = new LinkedHashMap<>();
        eventMap.put("seq", ++seq);
        eventMap.put("type", "LINE");
        eventMap.put("line", loc.lineNumber());
        eventMap.put("functionName", loc.method().name());

        captureFramesAndLocals(event.thread(), eventMap);
        events.add(eventMap);
    }

    private void handleMethodExitEvent(MethodExitEvent event) {
        Location loc = event.location();
        Value returnVal = event.returnValue();

        Map<String, Object> eventMap = new LinkedHashMap<>();
        eventMap.put("seq", ++seq);
        eventMap.put("type", "RETURN");
        eventMap.put("line", loc.lineNumber() > 0 ? loc.lineNumber() : 1);
        eventMap.put("functionName", loc.method().name());

        captureFramesAndLocals(event.thread(), eventMap);

        if (returnVal != null) {
            String typeName = event.method().returnTypeName();
            eventMap.put("returnValue", serializeValue("return", typeName, returnVal, 0));
            eventMap.put("explanation", "Method " + loc.method().name() + " returned " + formatValueRepr(returnVal));
        }

        events.add(eventMap);
    }

    private void handleExceptionEvent(ExceptionEvent event) {
        ObjectReference ex = event.exception();
        Location loc = event.location();

        Map<String, Object> eventMap = new LinkedHashMap<>();
        eventMap.put("seq", ++seq);
        eventMap.put("type", "EXCEPTION");
        eventMap.put("line", loc.lineNumber() > 0 ? loc.lineNumber() : 1);
        eventMap.put("functionName", loc.method().name());

        captureFramesAndLocals(event.thread(), eventMap);

        Map<String, Object> exMap = new LinkedHashMap<>();
        exMap.put("type", ex.referenceType().name());
        exMap.put("line", loc.lineNumber());

        String message = "";
        try {
            Field msgField = ex.referenceType().fieldByName("detailMessage");
            if (msgField != null) {
                Value msgVal = ex.getValue(msgField);
                if (msgVal instanceof StringReference) {
                    message = ((StringReference) msgVal).value();
                }
            }
        } catch (Exception ignored) {}

        exMap.put("message", message);
        eventMap.put("exception", exMap);
        eventMap.put("explanation", "Exception thrown: " + ex.referenceType().name() + (message.isEmpty() ? "" : ": " + message));
        events.add(eventMap);
    }

    private Map<String, Object> serializeValue(String name, String declaredType, Value val, int depth) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", name);
        map.put("type", declaredType);

        if (val == null) {
            map.put("value", null);
            map.put("repr", "null");
            return map;
        }

        if (val instanceof PrimitiveValue) {
            if (val instanceof BooleanValue) {
                boolean b = ((BooleanValue) val).value();
                map.put("value", b);
                map.put("repr", String.valueOf(b));
            } else if (val instanceof IntegerValue) {
                int i = ((IntegerValue) val).value();
                map.put("value", i);
                map.put("repr", String.valueOf(i));
            } else if (val instanceof LongValue) {
                long l = ((LongValue) val).value();
                map.put("value", l);
                map.put("repr", String.valueOf(l));
            } else if (val instanceof DoubleValue) {
                double d = ((DoubleValue) val).value();
                map.put("value", d);
                map.put("repr", String.valueOf(d));
            } else if (val instanceof FloatValue) {
                float f = ((FloatValue) val).value();
                map.put("value", f);
                map.put("repr", String.valueOf(f));
            } else if (val instanceof CharValue) {
                char c = ((CharValue) val).value();
                map.put("value", String.valueOf(c));
                map.put("repr", "'" + c + "'");
            } else {
                map.put("value", val.toString());
                map.put("repr", val.toString());
            }
            return map;
        }

        if (val instanceof StringReference) {
            String s = ((StringReference) val).value();
            if (s.length() > MAX_STRING_LENGTH) {
                s = s.substring(0, MAX_STRING_LENGTH) + "...";
                map.put("truncated", true);
            }
            map.put("value", s);
            map.put("repr", "\"" + s + "\"");
            return map;
        }

        if (val instanceof ArrayReference) {
            ArrayReference arr = (ArrayReference) val;
            int length = arr.length();
            map.put("isArray", true);
            map.put("length", length);

            List<Object> elements = new ArrayList<>();
            int fetchCount = Math.min(length, MAX_COLLECTION_ELEMENTS);
            List<Value> rawVals = arr.getValues(0, fetchCount);
            StringBuilder repr = new StringBuilder("[");

            for (int i = 0; i < fetchCount; i++) {
                Value elem = rawVals.get(i);
                Object serialized = elem instanceof PrimitiveValue ? ((PrimitiveValue) elem).toString() : formatValueRepr(elem);
                elements.add(serialized);
                repr.append(serialized);
                if (i < length - 1) repr.append(", ");
            }

            if (length > MAX_COLLECTION_ELEMENTS) {
                map.put("truncated", true);
                repr.append("... +").append(length - MAX_COLLECTION_ELEMENTS).append(" more");
            }
            repr.append("]");

            map.put("elements", elements);
            map.put("value", elements);
            map.put("repr", repr.toString());
            return map;
        }

        // Generic Object Reference
        if (val instanceof ObjectReference) {
            ObjectReference obj = (ObjectReference) val;
            String typeName = obj.referenceType().name();
            map.put("type", typeName);
            map.put("repr", typeName + "@" + Integer.toHexString(System.identityHashCode(obj)));

            if (depth < 2) {
                Map<String, Object> props = new LinkedHashMap<>();
                try {
                    for (Field field : obj.referenceType().visibleFields()) {
                        if (!field.isStatic()) {
                            Value fieldVal = obj.getValue(field);
                            props.put(field.name(), serializeValue(field.name(), field.typeName(), fieldVal, depth + 1));
                        }
                    }
                } catch (Exception ignored) {}
                map.put("properties", props);
            }
            return map;
        }

        map.put("value", val.toString());
        map.put("repr", val.toString());
        return map;
    }

    private String formatValueRepr(Value val) {
        if (val == null) return "null";
        if (val instanceof StringReference) return "\"" + ((StringReference) val).value() + "\"";
        if (val instanceof ArrayReference) {
            ArrayReference arr = (ArrayReference) val;
            int len = arr.length();
            if (len == 0) return "[]";
            StringBuilder sb = new StringBuilder("[");
            int fetch = Math.min(len, 6);
            List<Value> list = arr.getValues(0, fetch);
            for (int i = 0; i < fetch; i++) {
                sb.append(list.get(i) != null ? list.get(i).toString() : "null");
                if (i < len - 1) sb.append(", ");
            }
            if (len > 6) sb.append("...");
            sb.append("]");
            return sb.toString();
        }
        return val.toString();
    }

    private LaunchingConnector findLaunchingConnector() {
        for (Connector connector : Bootstrap.virtualMachineManager().allConnectors()) {
            if ("com.sun.jdi.CommandLineLaunch".equals(connector.name())) {
                return (LaunchingConnector) connector;
            }
        }
        return null;
    }

    private Thread startStreamReader(InputStream is, StringBuilder target) {
        Thread t = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                char[] buf = new char[1024];
                int n;
                while ((n = reader.read(buf)) != -1) {
                    synchronized (target) {
                        if (target.length() < MAX_OUTPUT_BYTES) {
                            int toAppend = Math.min(n, MAX_OUTPUT_BYTES - target.length());
                            target.append(buf, 0, toAppend);
                            if (target.length() >= MAX_OUTPUT_BYTES) {
                                target.append("\n[AlgoLens Tracer: Output truncated at 64KB limit]\n");
                            }
                        }
                    }
                }
            } catch (IOException ignored) {}
        });
        t.setDaemon(true);
        t.start();
        return t;
    }

    private void emitResult() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", executionError == null);
        result.put("language", "java");
        result.put("events", events);
        result.put("truncated", truncated);
        result.put("totalEvents", events.size());
        if (executionError != null) result.put("error", executionError);
        result.put("stdout", targetStdout.toString());
        result.put("stderr", targetStderr.toString());
        result.put("limitations", Arrays.asList(
            "Captured up to " + maxSteps + " source line and return events",
            "Arrays serialized up to " + MAX_COLLECTION_ELEMENTS + " elements",
            "Strings truncated at " + MAX_STRING_LENGTH + " characters"
        ));

        System.out.println(toJson(result));
    }

    private void emitError(String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", false);
        result.put("language", "java");
        result.put("events", Collections.emptyList());
        result.put("truncated", false);
        result.put("totalEvents", 0);
        result.put("error", message);
        result.put("stdout", "");
        result.put("stderr", message);
        result.put("limitations", Collections.emptyList());
        System.out.println(toJson(result));
    }

    // Lightweight, zero-dependency JSON serializer for JDI stdout emission
    private static String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) {
            return "\"" + escapeJson((String) obj) + "\"";
        }
        if (obj instanceof Number || obj instanceof Boolean) {
            return obj.toString();
        }
        if (obj instanceof Map) {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) obj).entrySet()) {
                if (!first) sb.append(",");
                first = false;
                sb.append("\"").append(escapeJson(String.valueOf(entry.getKey()))).append("\":");
                sb.append(toJson(entry.getValue()));
            }
            sb.append("}");
            return sb.toString();
        }
        if (obj instanceof Collection) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object item : (Collection<?>) obj) {
                if (!first) sb.append(",");
                first = false;
                sb.append(toJson(item));
            }
            sb.append("]");
            return sb.toString();
        }
        return "\"" + escapeJson(obj.toString()) + "\"";
    }

    private static String escapeJson(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < ' ') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }
}

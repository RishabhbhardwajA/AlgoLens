import { spawn, type ChildProcess } from "child_process";

/**
 * AlgoLens Process Tree Killer
 * ============================================================================
 * Ensures that when a timeout, error, or cancellation occurs, the entire
 * process tree (including child JVMs and detached debuggee processes) is
 * reliably terminated without leaving orphaned processes.
 */
export async function killProcessTree(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (!pid) return;

  if (process.platform === "win32") {
    // Windows: taskkill /F /T /PID <pid> forcibly kills the process and all child processes
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/F", "/T", "/PID", pid.toString()], {
        shell: false,
        stdio: "ignore",
      });
      killer.on("close", () => resolve());
      killer.on("error", () => {
        try {
          child.kill();
        } catch {
          // Process may already have exited
        }
        resolve();
      });
    });
  } else {
    // Unix / Linux: kill process group with SIGKILL
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        // Process may already have exited
      }
    }
  }
}

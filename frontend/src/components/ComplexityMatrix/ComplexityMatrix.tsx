import { Activity, Clock, Cpu, HardDrive } from "lucide-react";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";
import { formatBigO } from "@/utils/visualHelpers";

export function ComplexityMatrix({ algorithm }: { algorithm: VisualizableAlgorithm }) {
  return (
    <div className="flex-1 overflow-auto p-4 sm:p-8 relative bg-transparent">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/80 pb-6">
          <div className="p-3 bg-indigo-50/85 backdrop-blur-md border border-indigo-200/70 rounded-2xl shadow-xs shrink-0">
            <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Complexity Matrix
            </h2>
            <p className="text-slate-600 font-medium text-sm">
              Asymptotic analysis for {algorithm.name}
            </p>
          </div>
        </div>

        {/* Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Complexity */}
          <div className="relative overflow-hidden p-5 sm:p-8 rounded-3xl glass-surface group transition-all hover:shadow-[0_14px_38px_rgba(99,102,241,0.12)] hover:border-indigo-200/80">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
              <Clock className="w-64 h-64 text-indigo-600" />
            </div>

            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="p-2.5 bg-indigo-50/90 border border-indigo-200/60 rounded-xl backdrop-blur-sm">
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-800 uppercase tracking-widest">
                Time Complexity
              </h3>
            </div>

            <div className="relative z-10">
              <div className="text-3xl sm:text-5xl font-black text-indigo-700 tracking-tighter mb-4 font-mono break-words">
                {formatBigO(algorithm.complexity.time)}
              </div>
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                {algorithm.complexity.timeDescription ||
                  "Execution time scales according to this mathematical bound as input size grows."}
              </p>
            </div>
          </div>

          {/* Space Complexity */}
          <div className="relative overflow-hidden p-5 sm:p-8 rounded-3xl glass-surface group transition-all hover:shadow-[0_14px_38px_rgba(14,165,233,0.12)] hover:border-sky-200/80">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
              <HardDrive className="w-64 h-64 text-sky-600" />
            </div>

            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="p-2.5 bg-sky-50/90 border border-sky-200/60 rounded-xl backdrop-blur-sm">
                <HardDrive className="w-5 h-5 text-sky-600" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-800 uppercase tracking-widest">
                Space Complexity
              </h3>
            </div>

            <div className="relative z-10">
              <div className="text-3xl sm:text-5xl font-black text-sky-700 tracking-tighter mb-4 font-mono break-words">
                {formatBigO(algorithm.complexity.space)}
              </div>
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                {algorithm.complexity.spaceDescription ||
                  "Memory consumption scales according to this mathematical bound as input size grows."}
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="glass-surface rounded-3xl p-5 sm:p-8">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Asymptotic Growth Rates Reference
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="py-3 px-4 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                    Notation
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                    Name
                  </th>
                  <th className="py-3 px-4 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                    Scalability
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                <tr className="border-b border-slate-200/40 hover:bg-white/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-emerald-700">O(1)</td>
                  <td className="py-3 px-4 text-slate-800">Constant</td>
                  <td className="py-3 px-4 text-emerald-700">Excellent (Always the same)</td>
                </tr>
                <tr className="border-b border-slate-200/40 hover:bg-white/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-emerald-700">O(log n)</td>
                  <td className="py-3 px-4 text-slate-800">Logarithmic</td>
                  <td className="py-3 px-4 text-emerald-700">Very Good (Grows slowly)</td>
                </tr>
                <tr className="border-b border-slate-200/40 hover:bg-white/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-amber-700">O(n)</td>
                  <td className="py-3 px-4 text-slate-800">Linear</td>
                  <td className="py-3 px-4 text-amber-700">Fair (Scales directly)</td>
                </tr>
                <tr className="border-b border-slate-200/40 hover:bg-white/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-orange-700">O(n log n)</td>
                  <td className="py-3 px-4 text-slate-800">Linearithmic</td>
                  <td className="py-3 px-4 text-orange-700">Acceptable (Sorting limit)</td>
                </tr>
                <tr className="border-b border-slate-200/40 hover:bg-white/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-rose-700">O(n²)</td>
                  <td className="py-3 px-4 text-slate-800">Quadratic</td>
                  <td className="py-3 px-4 text-rose-700">Poor (Nested loops)</td>
                </tr>
                <tr className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-rose-800 font-bold">O(2ⁿ)</td>
                  <td className="py-3 px-4 text-slate-800">Exponential</td>
                  <td className="py-3 px-4 text-rose-800 font-bold">Terrible (Brute force limit)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-sky-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
    </div>
  );
}

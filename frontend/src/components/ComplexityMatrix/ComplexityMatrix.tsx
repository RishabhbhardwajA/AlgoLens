import { Activity, Clock, Cpu, HardDrive } from "lucide-react";
import type { VisualizableAlgorithm } from "@/engine/executionTypes";

export function ComplexityMatrix({ algorithm }: { algorithm: VisualizableAlgorithm }) {
  return (
    <div className="flex-1 overflow-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <Activity className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Complexity Matrix</h2>
            <p className="text-slate-500 font-medium">Asymptotic analysis for {algorithm.name}</p>
          </div>
        </div>

        {/* Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Complexity */}
          <div className="relative overflow-hidden p-8 rounded-2xl bg-white border border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.03)] group transition-all hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] hover:border-indigo-200">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
              <Clock className="w-64 h-64 text-indigo-600" />
            </div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 uppercase tracking-widest">Time Complexity</h3>
            </div>
            
            <div className="relative z-10">
              <div className="text-5xl font-black text-indigo-600 tracking-tighter mb-4 font-mono">
                O({algorithm.complexity.time})
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                {algorithm.complexity.timeDescription || "Execution time scales according to this mathematical bound as input size approaches infinity."}
              </p>
            </div>
          </div>

          {/* Space Complexity */}
          <div className="relative overflow-hidden p-8 rounded-2xl bg-white border border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.03)] group transition-all hover:shadow-[0_8px_30px_rgba(14,165,233,0.08)] hover:border-sky-200">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
              <HardDrive className="w-64 h-64 text-sky-600" />
            </div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-sky-50 rounded-lg">
                <HardDrive className="w-5 h-5 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 uppercase tracking-widest">Space Complexity</h3>
            </div>
            
            <div className="relative z-10">
              <div className="text-5xl font-black text-sky-500 tracking-tighter mb-4 font-mono">
                O({algorithm.complexity.space})
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                {algorithm.complexity.spaceDescription || "Memory consumption scales according to this mathematical bound as input size approaches infinity."}
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            Asymptotic Growth Rates Reference
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-xs">Notation</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-xs">Name</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider text-xs">Scalability</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-emerald-600">O(1)</td>
                  <td className="py-3 px-4 text-slate-700">Constant</td>
                  <td className="py-3 px-4 text-emerald-600">Excellent (Always the same)</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-emerald-500">O(log n)</td>
                  <td className="py-3 px-4 text-slate-700">Logarithmic</td>
                  <td className="py-3 px-4 text-emerald-500">Very Good (Grows slowly)</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-amber-500">O(n)</td>
                  <td className="py-3 px-4 text-slate-700">Linear</td>
                  <td className="py-3 px-4 text-amber-500">Fair (Scales directly)</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-orange-500">O(n log n)</td>
                  <td className="py-3 px-4 text-slate-700">Linearithmic</td>
                  <td className="py-3 px-4 text-orange-500">Acceptable (Sorting limit)</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-rose-500">O(n²)</td>
                  <td className="py-3 px-4 text-slate-700">Quadratic</td>
                  <td className="py-3 px-4 text-rose-500">Poor (Nested loops)</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-rose-600 font-bold">O(2ⁿ)</td>
                  <td className="py-3 px-4 text-slate-700">Exponential</td>
                  <td className="py-3 px-4 text-rose-600 font-bold">Terrible (Brute force limit)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Decorative Background Blur */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-sky-400/5 rounded-full blur-[100px] pointer-events-none z-0" />
    </div>
  );
}

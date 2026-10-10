import Link from "next/link";
import { ArrowRight, Globe, Lock, Users, BookOpen, GraduationCap, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 selection:bg-blue-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white border-b border-slate-800">
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 blur-[100px] rounded-full mix-blend-screen" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-40 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-sm text-slate-300 mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Exclusive to IIM PhD & FPM Alumni</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            The Academic <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Collaboration Engine
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            A high-trust digital network shifting the focus from mass corporate networking to high-value academic collaboration, citations, and tenure tracking.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/conferences"
              className="group bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] flex items-center justify-center"
            >
              Enter the Network 
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-24 relative -mt-20">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
              <Lock className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Gated Access</h3>
            <p className="text-gray-600 leading-relaxed">
              Verified <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">.ac.in</code> or <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">.edu</code> emails only. A highly moderated, low-friction environment designed specifically for scholars.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Global Tracker</h3>
            <p className="text-gray-600 leading-relaxed">
              Coordinate meetups, share cabs, or split Airbnbs at major academic conferences worldwide like AOM, ICIS, and AMA.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Shadow Directory</h3>
            <p className="text-gray-600 leading-relaxed">
              Map alumni to universities. Toggle "Open to Chat" to privately guide junior scholars on department culture and tenure realities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

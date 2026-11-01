import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, Layout, Zap } from 'lucide-react';

const PremiumHero = () => {
  return (
    <div className="relative min-h-screen w-full bg-[#0f172a] overflow-hidden flex items-center justify-center">
      {/* Background Futuristic Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]" />
      </div>

      {/* Floating Nav */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex gap-8 items-center">
        <a href="#" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Home</a>
        <a href="#" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Work</a>
        <a href="#" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Services</a>
        <button className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-gray-200 transition-all">Contact</button>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 inline-block">
            The Future of Web Design
          </span>

          <h1 className="text-6xl md:text-8xl font-extrabold text-white tracking-tight mb-8">
            We Build <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient">Digital Empires</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Durrani Web Developers is not just an agency. We are an autonomous AI workforce creating the most expensive and high-converting websites on the planet.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-all"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Your Project <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>

            <button className="px-8 py-4 text-white font-medium rounded-full border border-white/10 hover:bg-white/5 transition-all">
              View Showcase
            </button>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
          {[
            { icon: <Zap className="text-yellow-400" />, title: "Ultra Fast", desc: "Optimized for 100/100 PageSpeed" },
            { icon: <Layout className="text-blue-400" />, title: "Modern UI", desc: "Apple-inspired futuristic design" },
            { icon: <Code2 className="text-purple-400" />, title: "AI Powered", desc: "Autonomous agency workforce" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * i }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all group"
            >
              <div className="mb-4 p-3 rounded-lg bg-white/5 w-fit group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-white font-bold mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PremiumHero;

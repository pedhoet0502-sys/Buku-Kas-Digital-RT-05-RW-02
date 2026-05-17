import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000; // 3 seconds
    const interval = 30;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-indigo-600 flex flex-col items-center justify-center z-[9999] overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[100px]" />
      
      <div className="relative flex flex-col items-center text-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/20 shadow-2xl"
        >
          <Wallet size={48} className="text-white" strokeWidth={1.5} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="space-y-2 mb-12"
        >
          <h1 className="text-white text-3xl font-black tracking-tightest">
            KAS DIGITAL
          </h1>
          <p className="text-indigo-100 font-black tracking-[0.2em] text-[10px] uppercase opacity-80">
            RT 05 RW 02
          </p>
        </motion.div>

        <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        
        <p className="mt-4 text-[10px] font-black text-white/40 uppercase tracking-widest">
          {Math.round(progress)}%
        </p>
      </div>

      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-white/20 text-[9px] font-bold uppercase tracking-[0.3em]">
          Version 2.0.4 • 2026
        </p>
      </div>
    </div>
  );
}

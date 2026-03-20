import { useState, useEffect } from 'react';
import { Editor } from './components/Editor';
import { motion, AnimatePresence } from 'motion/react';
import logo from './logo.png';

const LoadingScreen = () => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.8, ease: "easeInOut" }}
    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }}
      className="relative"
    >
      <div className="w-24 h-24 flex items-center justify-center drop-shadow-2xl">
        <img src={logo} alt="Lumina Logo" className="w-full h-full object-contain rounded-[2rem]" />
      </div>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -inset-4 bg-blue-400/20 rounded-full blur-2xl -z-10"
      />
    </motion.div>
    
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="mt-8 text-center"
    >
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lumina</h1>
      <p className="text-sm text-slate-400 mt-2 font-medium uppercase tracking-[0.3em]">Illuminating your ideas</p>
    </motion.div>
    
    <div className="absolute bottom-12 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
        className="w-full h-full bg-blue-500"
      />
    </div>
  </motion.div>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-white/20">
      <AnimatePresence>
        {isLoading && <LoadingScreen key="loader" />}
      </AnimatePresence>
      <Editor />
    </div>
  );
}





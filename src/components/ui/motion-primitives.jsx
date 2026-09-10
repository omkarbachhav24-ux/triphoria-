import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useInView, useScroll, useTransform, useMotionValue, useMotionTemplate } from 'motion/react';

// Standard Expressive Easing Tokens
export const STUDIO_EASE = [0.22, 1, 0.36, 1];
export const STUDIO_EASE_SLOW = [0.16, 1, 0.3, 1];

// Staggered Text Mask Reveal (Word by Word / Line by Line)
export const TextReveal = ({ text, className = "", delay = 0, tag = "h1" }) => {
  const words = text.split(" ");
  const Tag = tag;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: delay
      }
    }
  };

  const wordVariants = {
    hidden: { y: "115%", opacity: 0 },
    visible: {
      y: "0%",
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: STUDIO_EASE
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className={`overflow-hidden inline-flex flex-wrap gap-x-3.5 gap-y-1 ${className}`}
    >
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden py-0.5">
          <motion.span variants={wordVariants} className="inline-block">
            {word}
          </motion.span>
        </span>
      ))}
    </motion.div>
  );
};

// Section / Element Scroll Reveal with Mask & Depth Scale
export const ScrollReveal = ({ children, className = "", delay = 0, direction = "up", scale = false }) => {
  const yOffset = direction === "up" ? 35 : direction === "down" ? -35 : 0;
  const xOffset = direction === "left" ? 35 : direction === "right" ? -35 : 0;

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: yOffset, 
        x: xOffset,
        scale: scale ? 0.96 : 1
      }}
      whileInView={{ 
        opacity: 1, 
        y: 0, 
        x: 0,
        scale: 1
      }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.75, delay, ease: STUDIO_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Continuous Scroll Parallax Wrapper
export const Parallax = ({ children, offset = 40, className = "" }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
};

// Animated Number Counter on Viewport Entry (One-time, velocity feel)
export const AnimatedCounter = ({ target, suffix = "", duration = 1.6 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = parseFloat(target);
    const stepTime = Math.abs(Math.floor((duration * 1000) / 60));
    const increment = end / 60;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(parseFloat(start.toFixed(1)));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className="inline-block tabular-nums">
      {Number.isInteger(target) ? Math.floor(count) : count}
      {suffix}
    </span>
  );
};

// Soft Section Bridge Transition (Anti-Hard Cut)
export const SectionBridge = ({ fromDark = true }) => {
  return (
    <div className={`w-full h-12 relative overflow-hidden pointer-events-none ${
      fromDark ? 'bg-gradient-to-b from-[#07090E] to-[#F5F5F0]' : 'bg-gradient-to-b from-[#F5F5F0] to-[#07090E]'
    }`}>
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#1F2636]/20" />
    </div>
  );
};

// Motion Primitive: Spotlight Card Interaction
export const Spotlight = ({
  children,
  className = "",
  size = 350,
  color = "rgba(255, 255, 255, 0.08)"
}) => {
  const mouseX = useMotionValue(-size);
  const mouseY = useMotionValue(-size);

  const handleMouseMove = useCallback((e) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(-size);
    mouseY.set(-size);
  }, [mouseX, mouseY, size]);

  const background = useMotionTemplate`radial-gradient(${size}px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 80%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden group ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background }}
      />
      {children}
    </div>
  );
};

// Motion Primitive: Text Scramble Character Transition
const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';

export const TextScramble = ({
  text,
  className = "",
  speed = 40,
  characterSet = DEFAULT_CHARS,
  autoStart = true
}) => {
  const [displayText, setDisplayText] = useState(text);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView && autoStart) return;

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) {
              return text[index];
            }
            return characterSet[Math.floor(Math.random() * characterSet.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }
      iteration += 1 / 2;
    }, speed);

    return () => clearInterval(interval);
  }, [isInView, text, speed, characterSet, autoStart]);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`} aria-label={text}>
      {displayText}
    </span>
  );
};


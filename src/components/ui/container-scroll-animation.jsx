import React, { useRef } from "react";
import { useScroll, useTransform, motion } from "motion/react";

export const ContainerScroll = ({ titleComponent, children, className = "" }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"],
  });

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Studio-tailored subtle perspective transform
  const rotate = useTransform(scrollYProgress, [0, 0.85], isMobile ? [4, 0] : [10, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.85], isMobile ? [0.95, 1] : [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0.6, 1]);
  const translate = useTransform(scrollYProgress, [0, 0.85], [40, 0]);

  return (
    <div
      className={`relative flex items-center justify-center p-2 sm:p-6 lg:p-10 ${className}`}
      ref={containerRef}
    >
      <div className="w-full relative" style={{ perspective: "1200px" }}>
        {titleComponent}
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            opacity,
            y: translate,
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

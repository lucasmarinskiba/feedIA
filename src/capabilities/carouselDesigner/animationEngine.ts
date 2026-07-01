/**
 * Animation Engine — Generates CSS keyframes + MP4 timing for carousel slides.
 * Supports: fade, slideLeft, slideUp, zoom, rotate animations.
 */

export interface AnimationSlide {
  slide: number;
  animation: {
    type: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate';
    duration: number;
    delay: number;
    easing: 'ease-in' | 'ease-out' | 'ease-in-out';
  };
  cssKeyframes: string;
}

export interface AnimationTimeline {
  css: string;
  timeline: Array<{
    slideId: number;
    delay: number;
    duration: number;
    animation: string;
  }>;
  totalDuration: number;
}

/**
 * Factory function for animation engine.
 * Returns methods for building animation timelines and CSS.
 */
export const animationEngine = () => {
  /**
   * Build animation timeline from slides.
   * Generates CSS keyframes + timing array for MP4 generation.
   */
  const buildAnimationTimeline = (
    slides: unknown[],
    totalDuration: number,
    defaultAnimationStyle: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate',
  ): AnimationTimeline => {
    const keyframesMap: Map<string, string> = new Map();
    const timeline: Array<{
      slideId: number;
      delay: number;
      duration: number;
      animation: string;
    }> = [];

    let cumulativeDelay = 0;

    slides.forEach((slide: any, idx: any) => {
      const animationType = slide.animation?.type || defaultAnimationStyle;
      const duration = slide.animation?.duration || 2500;
      const delay = slide.animation?.delay || 0;
      const easing = slide.animation?.easing || 'ease-out';

      // Generate keyframes for this animation type
      const keyframeId = `${animationType}-${idx}`;
      const keyframes = generateKeyframes(animationType, keyframeId, easing);

      if (!keyframesMap.has(keyframeId)) {
        keyframesMap.set(keyframeId, keyframes);
      }

      // Add to timeline
      timeline.push({
        slideId: idx + 1,
        delay: cumulativeDelay + delay,
        duration,
        animation: keyframeId,
      });

      cumulativeDelay += duration;
    });

    // Combine all keyframes
    const allKeyframes = Array.from(keyframesMap.values()).join('\n');

    // Generate CSS with slide animation classes
    const css = generateCSS(allKeyframes, slides, timeline);

    return {
      css,
      timeline,
      totalDuration: cumulativeDelay / 1000, // Convert to seconds
    };
  };

  /**
   * Generate @keyframes for animation type.
   */
  const generateKeyframes = (
    type: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate',
    keyframeId: string,
    easing: string,
  ): string => {
    switch (type) {
      case 'fade':
        return `
@keyframes ${keyframeId} {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
`;

      case 'slideLeft':
        return `
@keyframes ${keyframeId} {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
`;

      case 'slideUp':
        return `
@keyframes ${keyframeId} {
  0% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
`;

      case 'zoom':
        return `
@keyframes ${keyframeId} {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
`;

      case 'rotate':
        return `
@keyframes ${keyframeId} {
  0% { transform: rotate(5deg); opacity: 0; }
  100% { transform: rotate(0deg); opacity: 1; }
}
`;

      default:
        return `@keyframes ${keyframeId} { 0% { opacity: 0; } 100% { opacity: 1; } }`;
    }
  };

  /**
   * Generate complete CSS with slide classes and animations.
   */
  const generateCSS = (allKeyframes: string, slides: unknown[], timeline: unknown[]): string => {
    const slideCSS = slides
      .map((slide, idx) => {
        const timingInfo = timeline[idx];
        return `
.slide-${idx + 1} {
  animation: ${timingInfo.animation} ${timingInfo.duration}ms ${slide.animation?.easing || 'ease-out'} forwards ${timingInfo.delay}ms;
}
`;
      })
      .join('\n');

    return `
/* Animation Keyframes */
${allKeyframes}

/* Slide Animation Classes */
${slideCSS}

/* General Slide Styles */
.slide {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  box-sizing: border-box;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.slide h2 {
  margin: 0 0 12px 0;
  line-height: 1.3;
  text-align: center;
}

.slide p {
  margin: 0;
  line-height: 1.5;
  text-align: center;
}

.slide img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
  object-fit: cover;
}
`;
  };

  /**
   * Generate MP4 timing array for Runway/ffmpeg.
   * Used to render video with proper slide timings.
   */
  const generateMP4Timing = (
    slides: unknown[],
    timeline: unknown[],
  ): Array<{
    slideIndex: number;
    startTime: number;
    duration: number;
    transition: string;
  }> => timeline.map((timing, idx) => ({
      slideIndex: timing.slideId,
      startTime: timing.delay / 1000, // Convert to seconds
      duration: timing.duration / 1000,
      transition: timing.animation,
    }));

  return {
    buildAnimationTimeline,
    generateKeyframes,
    generateCSS,
    generateMP4Timing,
  };
};

export const GradientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 gradient-bg" />
      
      {/* Cyber grid pattern */}
      <div 
        className="absolute inset-0 opacity-20 animate-neon-flicker"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--accent)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--accent)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />
      
      {/* Animated scanlines */}
      <div 
        className="absolute inset-0 opacity-10 animate-glitch-scan"
        style={{
          backgroundImage: 'linear-gradient(to bottom, transparent 50%, hsl(var(--accent)) 50%)',
          backgroundSize: '100% 4px',
        }}
      />
      
      {/* Flashing neon orbs with color shift */}
      <div 
        className="absolute top-0 left-0 w-[900px] h-[900px] rounded-full blur-3xl animate-neon-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--primary)) 50%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
          animationDelay: '0s',
        }}
      />
      
      <div 
        className="absolute bottom-0 right-0 w-[1000px] h-[1000px] rounded-full blur-3xl animate-color-shift"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, hsl(var(--accent)) 50%, transparent 70%)',
          transform: 'translate(40%, 40%)',
          animationDelay: '1s',
        }}
      />
      
      <div 
        className="absolute top-1/2 left-1/2 w-[700px] h-[700px] rounded-full blur-3xl animate-neon-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          animationDelay: '2s',
        }}
      />
      
      <div 
        className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full blur-3xl animate-color-shift"
        style={{
          background: 'radial-gradient(circle, hsl(var(--gradient-mid-2)) 0%, hsl(var(--secondary)) 50%, transparent 70%)',
          animationDelay: '3s',
        }}
      />
      
      {/* Additional flashing spots */}
      <div 
        className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full blur-2xl animate-neon-flicker"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 60%)',
        }}
      />
      
      <div 
        className="absolute bottom-1/4 left-1/2 w-[600px] h-[600px] rounded-full blur-3xl animate-neon-pulse"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--accent)) 40%, transparent 70%)',
          animationDelay: '1.5s',
        }}
      />
      
      <div 
        className="absolute top-1/2 right-1/3 w-[450px] h-[450px] rounded-full blur-2xl animate-neon-flicker"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 60%)',
          animationDelay: '0.8s',
        }}
      />
    </div>
  );
};

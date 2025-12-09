const MSGLogo = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main Body - Solid Dark Gray */}
    <path 
      d="M100 20 L170 60 V140 L100 180 L30 140 V60 L100 20Z" 
      fill="#1F2937" 
    />
    
    {/* The "M" Cutout / Visor - Solid Emerald-600 */}
    <path 
      d="M60 85 L85 110 L100 95 L115 110 L140 85 V120 H120 V115 L100 135 L80 115 V120 H60 V85Z" 
      fill="#059669"
    />
    
    {/* Hard Shadow for dimension */}
    <path 
      d="M100 180 L100 95 L60 85 V60 L30 60 V140 L100 180Z" 
      fill="black" 
      fillOpacity="0.1" 
    />
  </svg>
);

export default MSGLogo;

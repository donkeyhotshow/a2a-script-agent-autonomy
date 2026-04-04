export function A2ALogoSVG({
  className,
  width,
  height,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" />
      <path
        d="M50 20L20 80H35L42.5 65H57.5L65 80H80L50 20ZM50 40L55 55H45L50 40Z"
        fill="currentColor"
      />
    </svg>
  );
}

const Loader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-[2px] bg-black/10 z-[1000]">
      <div className="loader" />
      <style jsx="true">{`
        .loader {
          width: 45px;
          aspect-ratio: 1;
          --c: conic-gradient(from -90deg, #000 90deg, #0000 0);
          background: var(--c), var(--c);
          background-size: 40% 40%;
          animation: l19 1s infinite alternate;
        }

        @keyframes l19 {
          0%,
          10% {
            background-position: 0 0, 0 calc(100% / 3);
          }
          50% {
            background-position: 0 0, calc(100% / 3) calc(100% / 3);
          }
          90%,
          100% {
            background-position: 0 0, calc(100% / 3) 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;

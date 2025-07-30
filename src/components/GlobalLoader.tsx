

const GlobalLoader = () => {
  return (
    <div className="fixed inset-0 bg-white-900/20 backdrop-blur-sm z-50 flex flex-col justify-center items-center">
      <div className="flex items-center space-x-2">
        <span className="w-3 h-3 bg-brand rounded-full animate-pulse delay-0"></span>
        <span className="w-3 h-3 bg-brand rounded-full animate-pulse delay-150"></span>
        <span className="w-3 h-3 bg-brand rounded-full animate-pulse delay-300"></span>
      </div>
      <p className="text-brand text-sm mt-4 font-semibold">Loading...</p>
    </div>
  );
};

export default GlobalLoader;

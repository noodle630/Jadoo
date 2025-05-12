import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="w-full max-w-md mb-8">
        <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Project S
        </h1>
        <p className="text-center text-gray-400 mt-2">
          AI-powered inventory data transformation
        </p>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <div className="mt-12 text-gray-500 text-sm text-center">
        <p>© 2025 Project S. All rights reserved.</p>
      </div>
    </div>
  );
}
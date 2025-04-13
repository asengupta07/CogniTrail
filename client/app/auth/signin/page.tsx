"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

export default function SignIn() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-xl rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.2)]"></div>

        <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              CogniTrail
            </h1>
            <p className="mt-3 text-white/70">
              Explore and visualize your learning journey with our interactive
              knowledge maps
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl 
                        shadow-lg flex items-center justify-center gap-3 transition-all
                        border border-white/20 hover:border-cyan-300/70 backdrop-blur-sm group"
            >
              <Image src="/google.svg" alt="Google" width={20} height={20} />
              <span className="font-medium group-hover:text-cyan-300">
                Continue with Google
              </span>
            </button>

            <button
              onClick={() => signIn("github", { callbackUrl: "/" })}
              className="w-full px-6 py-3 bg-[#24292F]/80 hover:bg-[#24292F] text-white rounded-xl 
                        shadow-lg flex items-center justify-center gap-3 transition-all
                        border border-white/20 hover:border-purple-300/70 backdrop-blur-sm group"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="font-medium group-hover:text-purple-300">
                Continue with GitHub
              </span>
            </button>
          </div>

          <p className="mt-8 text-sm text-center text-white/50">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

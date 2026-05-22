import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { FaApple } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const slides = [
  "/C1.png",
  "/C2.png",
  "/C3.png",
  "/C4.png",
  "/C5.png",
  "/C6.png",
];

function GoogleIcon() {
  return (
    <img
      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      alt="Google"
      className="w-5 h-5"
    />
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [slide, setSlide] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, []);

  const getStrength = () => {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
  };

  const strength = getStrength();

  const strengthText = [
    "",
    "Weak",
    "Fair",
    "Good",
    "Strong",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      password !== confirmPassword
    ) {
      toast.error(
        "Passwords do not match"
      );
      return;
    }

    try {
      setLoading(true);

      await register(
        name.trim(),
        email.trim(),
        password
      );

      toast.success("Account created!");

      navigate("/dashboard");
    } catch (error) {
      toast.error(
        "Unable to create account"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#00040b]">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
        {/* LEFT PANEL */}
        <div className="relative hidden lg:block overflow-hidden bg-[#00040b]">
          {slides.map((img, index) => (
            <img
              key={img}
              src={img}
              alt="Preview"
              className={`absolute inset-0 w-full h-full object-contain transition-all duration-[1400ms] ease-in-out ${
                slide === index
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95"
              }`}
            />
          ))}

          {/* dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() =>
                  setSlide(index)
                }
                className={`h-2 rounded-full transition-all duration-300 ${
                  slide === index
                    ? "w-8 bg-[#00FFDD]"
                    : "w-2 bg-white/45"
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="relative bg-[#fbfdfc] rounded-l-[42px] flex items-center justify-center px-8 sm:px-12 lg:px-16 py-8 shadow-2xl">
          <div className="w-full max-w-[430px] pt-16">
            {/* logo */}
            <div className="absolute top-8 left-10 flex items-center gap-3 z-20">
              <img
                src="/lm-logo.png"
                alt="SpendWise"
                className="h-8 w-auto"
              />
              <span className="text-[28px] font-bold text-[#061311] leading-none">
                SpendWise
              </span>
            </div>

            {/* heading */}
            <h1 className="text-[34px] font-bold text-[#061311] leading-tight tracking-tight">
              Create account
            </h1>

            <p className="text-[17px] text-[#6f7b78] mt-2">
              Start tracking your finances smarter.
            </p>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-4"
            >
              {/* name */}
              <div>
                <label className="block text-sm font-semibold text-[#061311] mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="John Doe"
                  className="w-full h-12 rounded-xl border border-[#d7e2df] bg-white px-4 outline-none focus:border-[#00FFDD] focus:ring-4 focus:ring-[#00FFDD]/15 transition"
                />
              </div>

              {/* email */}
              <div>
                <label className="block text-sm font-semibold text-[#061311] mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="you@example.com"
                  className="w-full h-12 rounded-xl border border-[#d7e2df] bg-white px-4 outline-none focus:border-[#00FFDD] focus:ring-4 focus:ring-[#00FFDD]/15 transition"
                />
              </div>

              {/* password */}
              <div>
                <label className="block text-sm font-semibold text-[#061311] mb-2">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    placeholder="Create password"
                    className="w-full h-12 rounded-xl border border-[#d7e2df] bg-white px-4 pr-12 outline-none focus:border-[#00FFDD] focus:ring-4 focus:ring-[#00FFDD]/15 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#93a09d]"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {/* strength */}
                {password && (
                  <div className="mt-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(
                        (bar) => (
                          <div
                            key={bar}
                            className={`h-1 flex-1 rounded-full ${
                              bar <=
                              strength
                                ? "bg-[#00FFDD]"
                                : "bg-[#d7e2df]"
                            }`}
                          />
                        )
                      )}
                    </div>

                    <p className="text-xs text-[#6f7b78] mt-2">
                      {
                        strengthText[
                          strength
                        ]
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* confirm */}
              <div>
                <label className="block text-sm font-semibold text-[#061311] mb-2">
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    required
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="Repeat password"
                    className="w-full h-12 rounded-xl border border-[#d7e2df] bg-white px-4 pr-12 outline-none focus:border-[#00FFDD] focus:ring-4 focus:ring-[#00FFDD]/15 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#93a09d]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#00FFDD] text-[#00110F] font-bold text-lg flex items-center justify-center gap-2 hover:brightness-95 transition"
              >
                {loading ? (
                  "Creating..."
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* divider */}
            <div className="relative my-7">
              <div className="border-t border-[#e0e8e6]" />

              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-[#fbfdfc] px-3 text-sm text-[#8b9693]">
                or continue with
              </span>
            </div>

            {/* SOCIAL */}
            <div className="grid grid-cols-2 gap-4">
              <button className="h-12 px-5 rounded-xl border border-[#d7e2df] bg-white hover:bg-[#f7fbfa] transition font-semibold text-[#13201d] flex items-center justify-center gap-3">
                <GoogleIcon />
                <span>Google</span>
              </button>

              <button className="h-12 px-5 rounded-xl border border-[#d7e2df] bg-white hover:bg-[#f7fbfa] transition font-semibold text-[#13201d] flex items-center justify-center gap-3">
                <FaApple className="text-[17px]" />
                <span>Apple</span>
              </button>
            </div>

            {/* bottom */}
            <p className="text-center text-sm text-[#6f7b78] mt-7">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#00bfa8] font-semibold hover:text-[#009f8c]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
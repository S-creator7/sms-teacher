import { useContext, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Input from "../components/CustomInput";
import { useForm } from "react-hook-form";
import { UserContext } from "../components/Provider";
import { ForgotPassword, LogInApi } from "../Utility/loginApi";
import toast from "react-hot-toast";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const loginSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  password: yup.string().required("Password is required"),
});

const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const schema = isForgotPassword ? forgotPasswordSchema : loginSchema;
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });
  const { loading, setLoading } = useContext(UserContext);

  const onSubmit = async (data) => {
    if (isForgotPassword) {
      setLoading(true);
      const body = {
        email: data.email,
      };
      try {
        const emailRes = await ForgotPassword(body);
        if (emailRes?.status) {
          setLoading(false);
          setValue("email", "");
          toast.success(emailRes?.message);
        }
      } catch (error) {
        setLoading(false);
        toast.error(error?.response?.data?.message);
        console.error(error);
      }
    } else {
      setLoading(true);
      const body = {
        username: data.username,
        password: data.password,
      };
      try {
        const logInRes = await LogInApi(body);
        if (logInRes?.status) {
          const data = logInRes?.resources?.data;
          toast.success(logInRes?.message);
          localStorage.setItem("user", JSON.stringify(data));
          if (data?.token) localStorage.setItem("token", data.token);
          setLoading(false);
          navigate("/dashboard");
        }
      } catch (error) {
        setLoading(false);
        toast.error(error?.response?.data?.message);
        console.error(error);
      }
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center">Teacher Portal</h2>
        <p className="text-gray-600 text-center mb-6">
          Secure Authentication Required
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isForgotPassword ? (
            <Input
              type="email"
              name="email"
              label="Email"
              placeholder="Enter your email"
              register={register}
              required
            />
          ) : (
            <>
              <Input
                type="text"
                name="username"
                label="Username"
                placeholder="Enter your username"
                register={register}
                required
              />

              <div>
                <label className="block text-gray-700 font-medium">
                  Password<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-3 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Enter your password"
                    {...register("password", { required: true })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-4 flex items-center text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setValue("username", "");
                    setValue("password", "");
                  }}
                  className="text-blue-500 hover:underline w-fit float-right mt-1"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition duration-300 disabled:opacity-50"
            disabled={loading}
          >
            {loading
              ? isForgotPassword
                ? "Sending..."
                : "Logging in..."
              : isForgotPassword
              ? "Send Reset Link"
              : "Login"}
          </button>

          {isForgotPassword && (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setValue("email", "");
              }}
              className="text-sm text-gray-600 hover:text-black mt-2 block text-center w-full"
            >
              ← Back to Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;

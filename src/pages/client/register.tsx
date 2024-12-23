import { RegisterFormContainer } from "@/components/client/register/RegisterFormContainer";

export default function ClientRegister() {
  return (
    <div className="h-screen w-screen overflow-y-auto bg-gray-50">
      {/* Background container */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=2000&q=80")',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content container */}
      <div className="relative flex flex-col justify-center items-center min-h-screen py-8 px-4">
        <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-6">
          <RegisterFormContainer />
        </div>
      </div>
    </div>
  );
}
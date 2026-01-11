import { useNavigate } from "react-router-dom";

const AuthModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-[360px]">
        <h2 className="text-lg font-bold mb-2">
          Sign in to collaborate
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Create rooms, invite teammates, and collaborate in real time.
        </p>

        <button
          onClick={() => navigate("/auth", {
            state: { from: "/create-room" }
          })}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg"
        >
          Sign in / Sign up
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 text-sm text-gray-500"
        >
          Continue demo
        </button>
      </div>
    </div>
  );
};

export default AuthModal;

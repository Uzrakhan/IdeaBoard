import { useState } from "react";
import Whiteboard from "../components/Whiteboard";
import DemoBanner from "../components/DemoBanner";
import AuthModal from "../components/AuthModal";

const DemoWhiteboardPage = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="h-screen w-full relative">
      <DemoBanner onSignIn={() => setShowAuthModal(true)} />

      <Whiteboard mode="demo" />

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default DemoWhiteboardPage;

import { Link } from "react-router-dom";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <>
      {user && <AppNav />}
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">Esta página no existe</p>
          <Link to="/" className="font-semibold text-red-800 underline hover:text-red-950">
            Volver a Inicio
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;

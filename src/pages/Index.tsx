
import { useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useOptimizedEffect(() => {
    // Redirect to login page
    navigate("/");
  }, [navigate]);

  return null;
};

export default Index;

import Chatbot from '@/components/Chatbot';

export default function Home() {
  return (
    <main className="main-content">
      <Chatbot />
      
      <style>{`
        .main-content {
          min-height: 100vh;
          position: relative;
          z-index: 1;
        }
      `}</style>
    </main>
  );
}

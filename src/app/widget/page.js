import Chatbot from "@/components/Chatbot";

export default function WidgetPage() {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "transparent",
      overflow: "hidden"
    }}>
      <Chatbot initialOpen={true} hideFab={true} />
    </div>
  );
}
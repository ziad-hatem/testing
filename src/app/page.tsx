import SpinWheel from "@/components/SpinWheel";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <h1 className="text-3xl font-bold mb-8 text-foreground">
        Spin & Win Casino
      </h1>
      <SpinWheel />
    </div>
  );
}

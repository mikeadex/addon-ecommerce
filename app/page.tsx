export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">Welcome to Our Store</h1>
        <p className="text-xl mb-8">Modern E-commerce Experience</p>
        <a
          href="/shop"
          className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Start Shopping
        </a>
      </div>
    </div>
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		unoptimized: true, // Allows smooth local serving of filesystem images without external image domains
	},
};

export default nextConfig;

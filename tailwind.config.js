/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: '#0d1117',
                surface: '#161b22',
                border: '#30363d',
                accent: '#2f81f7',
                text: '#e6edf3',
                muted: '#8b949e',
            },
            borderRadius: {
                lg: '12px',
                md: '6px',
            }
        },
    },
    plugins: [],
}

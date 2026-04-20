export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                sand: '#f6f0e4',
                ember: '#9a3412',
                bronze: '#c2410c',
                ink: '#1f2937',
                mist: '#f8fafc',
                moss: '#3f6a52',
            },
            fontFamily: {
                sans: ['Pretendard Variable', 'IBM Plex Sans KR', 'sans-serif'],
            },
            boxShadow: {
                panel: '0 20px 50px rgba(15, 23, 42, 0.08)',
            },
            backgroundImage: {
                'hero-glow': 'radial-gradient(circle at top left, rgba(251, 191, 36, 0.35), transparent 40%), radial-gradient(circle at bottom right, rgba(154, 52, 18, 0.18), transparent 35%)',
            },
        },
    },
    plugins: [],
};

// https://stenciljs.com/docs/config
export const config = {
    outputTargets: [
        {
            type: 'www',
            serviceWorker: {
                swSrc: 'src/sw.js'
            }
        }
    ],
    globalScript: 'src/global/app.ts',
    globalStyle: 'src/global/app.css'
};

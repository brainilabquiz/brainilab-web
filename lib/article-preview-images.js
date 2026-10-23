// Exact cover identities only: a replacement artwork must not inherit an old preview.
// Originals are copied unchanged; on-page 960/480/240 WebP assets remain separate.
// The build checks both hashes and the PNG dimensions before publication.
export const articlePreviews=Object.freeze({
  "/assets/images/learn/can-woolly-bear-caterpillars-predict-winter.webp": {
    "src": "/assets/images/learn/can-woolly-bear-caterpillars-predict-winter-preview-4e5cb57b4246.png",
    "width": 1536,
    "height": 1024,
    "type": "image/png",
    "coverSha256": "529c64f80538d309714693f7fdca855ad37fe705bf38a8a2a2e920cb8064fa5c",
    "previewSha256": "4e5cb57b4246313639b43379751cc74391237f2aa12316cb537d7d5666197c97"
  },
  "/assets/images/learn/why-orionids-return-in-october.webp": {
    "src": "/assets/images/learn/why-orionids-return-in-october-preview-3dbff8941c2d.png",
    "width": 1536,
    "height": 1024,
    "type": "image/png",
    "coverSha256": "47665b69033a888b2c76e99ef031bc4c2a56c902ea27e8e0f56b2158c5c4ac97",
    "previewSha256": "3dbff8941c2dae6f8cb4758f7a9af47cbe28aabb4e9ab37a43a62aa80a8e46ff"
  },
  "/assets/images/learn/curiosity-daily-20261014.webp": {
    "src": "/assets/images/learn/how-does-a-toilet-flush-preview-c921e6bd605d.png",
    "width": 1536,
    "height": 1024,
    "type": "image/png",
    "coverSha256": "ef57f37741432733704783eea818a39c85266c428f604a0d07b14f76697eaa64",
    "previewSha256": "c921e6bd605d1b618bbd0e3dc4fdbba099c739a9e05f3afdf7abbab1ea3b48df"
  },
  "/assets/images/learn/curiosity-weekly-20261014.webp": {
    "src": "/assets/images/learn/what-is-a-dana-preview-28e31f7d956e.png",
    "width": 1536,
    "height": 1024,
    "type": "image/png",
    "coverSha256": "86ad55e8eb3bc3b68c1ecc9f099ef8c63356c6d502e0eaf4a88c0a9824e6c6d1",
    "previewSha256": "28e31f7d956ee2a2edadb5f09ba603142519e6ec334354369c76c4444d2616f0"
  },
  "/assets/images/learn/why-are-sunsets-red.webp": {
    "src": "/assets/images/learn/why-are-sunsets-red-preview-3ba492e9c6ad.png",
    "width": 1536,
    "height": 1024,
    "type": "image/png",
    "coverSha256": "41881103a9a3d891941b2fc020a30389faebac431eb0fe3f609407917d8a0fdd",
    "previewSha256": "3ba492e9c6adfdccc03eedc741d627b24522a5a96882f4b038393077bbabafad"
  },
  "/assets/images/learn/why-is-the-sky-blue.webp": {
    "src": "/assets/images/learn/why-is-the-sky-blue-preview-d09480ff097c.png",
    "width": 1536,
    "height": 1024,
    "type": "image/png",
    "coverSha256": "c952768ecba486623c46c4bb050aca19ca3f65fdfc213ca3e2fb384533e3bb62",
    "previewSha256": "d09480ff097cfbc3235fd5c1889f900841a0f0a77489d979066b8b3879e6a412"
  }
});
export function articlePreviewImage(cover){
 return Object.hasOwn(articlePreviews,cover?.src)?articlePreviews[cover.src]:null;
}

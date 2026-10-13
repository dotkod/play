# @kualalepak social kit

All assets are rendered from the real game (`/promo` route, local only). To regenerate after
the city changes:

```bash
KL_MEMORY_REDIS=1 pnpm exec next dev -p 3212
node scripts/promo.mjs http://localhost:3212          # everything
node scripts/promo.mjs http://localhost:3212 video    # just one: avatar | monogram | wordmark | post-welcome | post-anne | video
```

| File | Use |
|---|---|
| `kualalepak-avatar.png` | Profile picture, option A (wordmark on sunset). 2160 × 2160, circle-safe |
| `kualalepak-avatar-kl.png` | Profile picture, option B (KL badge). Best at tiny sizes |
| `kualalepak-wordmark.png` | Transparent wordmark for stories, stickers, video overlays |
| `post-1-welcome.png` | Intro post 1 (1080 × 1080) |
| `post-2-anne-maju.png` | Intro post 2 (1080 × 1080) |
| `intro-video.mp4` | Square intro reel (1080 × 1080, 15 s, no audio: add a trending sound in-app) |

## Bio

> Bandar 3D ala Malaysia 🇲🇾 Jalan-jalan, cari kerja, lepak.
> Main percuma dalam browser 👇
> kl.dotkod.com

## Captions

**Post 1 (welcome)**

> Selamat datang ke Kuala Lepak 🇲🇾
>
> Bandar 3D ala Malaysia yang kau boleh main terus dalam browser. Jalan-jalan kat shophouse, naik LRT, tengok rider GRAP dengan SHOPI berebut jalan, lepak mamak sampai malam.
>
> Siang malam ikut jam kau. Jerebu pun ikut cuaca betul KL 😷
>
> Main percuma: kl.dotkod.com
>
> #kualalepak #gamemalaysia #indiegamemy #webgame #3dgame #mamak #malaysia

**Post 2 (Anne Maju)**

> Kerja pertama kau: jadi anne mamak 🍵
>
> 90 saat. Dengar order, bancuh, hantar. Teh tarik kurang manis, Milo ais, kopi O kosong... salah sikit, pelanggan merajuk. Laju, tip masyuk.
>
> Berani lawan rekod kawan kau? 🏆
>
> kl.dotkod.com
>
> #kualalepak #annemaju #tehtarik #mamak #gamemalaysia #indiegamemy

**Video (intro reel)**

> Ni Kuala Lepak. Bandar kecil, hidup penuh 🌇
>
> Rider merata, lampu jalan menyala bila malam, dan mamak Anne Maju tunggu kau start shift.
>
> Main percuma terus dalam browser: kl.dotkod.com
>
> #kualalepak #gamemalaysia #webgame #indiegame #mamak #malaysia

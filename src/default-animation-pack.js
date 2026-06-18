export const defaultAnimationPack = {
  id: "default-pack",
  version: 1,
  spritesheets: {
    explosion: {
      image: "data:image/png;base64,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",
      frameWidth: 32,
      frameHeight: 32,
      frames: 8,
      drawSize: 72
    },
    dagger: {
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAgCAYAAAD9qabkAAAD+ElEQVR4AexbCXLkIAzE+8fMI2ce6VU7kUMoEMaAueRahUNYF+4exlvzz+ilFdAKLFsBJYBlt14T1woYowSgT4FWYOEKKAEsvPma+toVQPZKAKiCilYgoQJfxuwhSTDTxVIlgC62QYOIVeBNoIPE1tXWA/iSj5heureFbggC2H+uFgVSn31U4GXMBjGNr48xW0zMQFf3BADscz3tPs9pqxWIVWC0T+VYPiX0bKNrAvAB3jfHyazU8nEYLaRl7q39x3LHJ3Zszar6bglAArqkW2Uj+TiMFlI67xRQx/yn2Cqdh9qTK9AtAchh0xshYoHYmpn0PhD55krlHAN1KT9qp20FuiWAja5YaYgD9tiaWvr9/d5P2d+PxOEC3gYpdJBa+ebYteOU7NSKH+8AIJLvlXR2rt0SAIIkDtjQStKCBAB8Q0+U+aI/EBocc1KgmToGUQwktt7uZ7of+na8A4AMnUSl4LsmAOTcGwkcQP8BPeI7heYO3TlRp8NE4FrneW5zwG/fa/ddn6XHHHtpu2ovXIEsAqBDMB1+9+rH315IYKdsj0/9UD3pQFCDBABCCNxyi74rNoDQh7hrUsd3bUhxpsbQ63psN6TX+K7EdZsAAH52YPd5rnTbBQnQOVLOix4HecEtLUDIIhkoBTr4kvxc0ZWwccVPqzW00+cHn91vFc9Vv+662wTgGnpi3AUJPJHoTR+zg+5mWY7bRgbpkUClP7cJ4EVo5JjsPs/Vaslt4xeDkWMAPWm1cofd0UBe6lSC3HOEdi363KTYt+3ZfckGPRrnj4ikdU/qbhMAggTwIeg/Ka1IYHu9NkO7Hcz18zHbRmuCC8ooroLq6royUfmtjEZY/iz8sx/z/bsAI1wh0PO8cOsjqiwCeCTCgJO2JEBb/ycuGgP8IIg/82UGADIk1drM4EutRWw9AxJtbG2Knp6M48dDvnug883XmvPZHZYAkExTEsBRgEBvDjHmOB2YepcNZrsPj3fIAfc9ISmxpawtGbsLendcwhfA7koJu7k2hiYAJN+MBOioD9CzIJZa4gLe9cP6VgBy4xlt7AIT49FyuBvv8ASAxGMkENPDxujC4Oe2l3yYnK7Ek7L2ir0e1+B0YUvrGKcgABQxBPLQPO6ZSQAelpnymi0XnC5seSq/kJ9pCAAJumB3x1ijohXQCvxWYCoCQFoMem4xp1KuAr19xSiX2ZqWpiMAbKOCH1WoI/iaUceyWm1RgSkJoEUh1adWoNcKSHEpAUjVUd1SFcDb+aUSpmSVAKgI+i9cAXznh4RXjK0B6FmQCffRYjy7KAHMvsOZ+eE7PyTTTLe383/J+QIECdjiWzP6nBLA6Duo8WsFhArEVP8BAAD//9ZDQJAAAAAGSURBVAMAGX86RJDGB+YAAAAASUVORK5CYII=",
      frameWidth: 32,
      frameHeight: 32,
      frames: 8,
      drawSize: 80
    },
    crosshair: {
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAAgCAYAAABEmHeFAAAEoUlEQVR4AeyaC3LjIBBEpb1jfEjnkFqeoq5CY8B8hI0TUtsLzPQ0H89g2cm/Zf7ME/jDJzAL4A+/+HPryzILYGbBnz6BogK437dtx7Zt9tR2++G3vjmeJzDqCWQVgJL7dlvXHeu62g3t9sMvvuXM8TyB0U4gWQBKZCV37uLFV3xu3Gt5c7Z5Akv8MwDJywGRzLQ1UKy0ajRsjHvK2lKw/DmeJ5A6geA7gBJWCZwSeOaThjSf8WN+kh6fe8paU4AjLv2JPiewfX1tPvrM0l81WABMq8Sl34oWrbv7wA1Yg1r6MYhDC2K8FvvPNwFOnar20KL5CbGphE/5Rt7bQwHwerYkbGyzaKId86fs/o2f4uEr4cIvgRKfmJ9vA9xsbMwBm+9n/JtAgms/6/f3GoL8Ple2UduHAhhpoe6Offi6tXR9V2gwJ8lNm4MSbo6e5ZBgIVhedFzoYC5ClPT0Q/D9ignxWm1oh1CjeyoAbmh3ma01QjkxaDNHDnckjhLav/Xt+qxPMZbXMtaLLg0/4bBZP7ZWoIkGc9EXsPmQnRYuPvq0VwE9ENPDB2L+kP1UACHCu2zc3O4BY//AW7sGxaNVqzFiHAkGtDb6QOOeLfMAOwc2YO2jj4ctgFEOruUmb4m1+9fNlkoy+cS1GrVj6ZbE18Sk9Ev2VMI9FQCPKKlFXOF7xRxXrNPX0OONb0v1S/kprZTPfUDib1Jck2LV+2wi5SS15ViN+tX0iTwVQJ8p+qm6b0j3f/1mSCvvk7v/0qzrvH5yuazflvt9AXv/mMbnHKZuzcYHOoduEzwTvv/s/xnN99v+RxeA3cwczxMoPYGPLoD1+Cnd9FX8Y/pu35rZdfqPE27SdbndFrD3D7LPOUzdmlc96kU3cOw/6s9wnArAvZu5d9OMqAbKK+ZoWF4wdGPRDkFnwFjKD0hkmUh8kEWuINnHqZzishyrUbGMriGnAug604eKc8vVLr0l1s6pRLIJ5vPkE9f3tfSlW6JRE5PSL9lTCXfYAuA7fL6/B6mDSfmIBWileJ/mI7mA1k0faNyzZR5g58AGrH308akAbi5T3Dt9t8cgtJnjPYdSP6tucj3a0Fo1bAI+xdC/CtxsQHokHNAYH9D4ilZ6zENfsNqy08LFT5/2KqAHYnr4QMwfsp8KIER4p83Vo3vEbVvBFRqsoCShS7hol4IXOYRSnVw+c8ElsQH9EPABfIqhfzXQDqFmnocC4Ibmpq4RS8WgiXaKE/PxGCPEOLKLRyvbVS2JDdDTba8WGz5A/7eBhNOeSPIQ5Pe5so3aPhSAFnplArVocYMDrSu3JQbk8kt4JHkIJRqfyCWxBbt+2Wmtb+RxsAD2m/qbXzLym/a25XPzL05r12yQIpkBxSRITmNaOEC+2fY5ARLdR59Z+qsGC4BplbB7AmOoALHogIrwYAjJLYigMa1ss/VOYHajJxAtACJIXMDNSjJjywFcQGwOf3LmCbzrBJIFoEVxs5LMJPWOwB+A7XZXKbRwgeJnO09g1BPIKgAtnqTesa4PX0/udlcptOLPdp7A6CdQVACjb2aub55A6QnMAig9scn/qBN4ttj/AAAA//8v98QqAAAABklEQVQDAAfPGm6rYTQuAAAAAElFTkSuQmCC",
      frameWidth: 32,
      frameHeight: 32,
      frames: 6,
      drawSize: 96
    },
    slash: {
      image: "data:image/png;base64,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",
      frameWidth: 32,
      frameHeight: 32,
      frames: 8,
      drawSize: 84
    },
    shockwave: {
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAgCAYAAAD9qabkAAAG3UlEQVR4AeycDYLqKBCE495RD6mHdPvDqbHDAAGSaHziWkL/VRNMd6LOvv+m8Rg70LgD1/P9nkIjzXA/wA6MBnCAN+ETluALPrfeGp9cbIve5/HzFo7h+9iB0QAe+/Axr9erXX0L2PpAVGDivdxOpxLkF8dJ3zvCp9hcftm9r3RjTO/AaADpfTmcVoXPwi4XK0LD2QQg2cTJ+yH3giICxPuCQy4h9oUDlGJKNsXCW/LzNvkq1tvG/LkDzEYDYBc6cI8eHRRVISpoFTmjAm82ATaEJzZBccHQ+OILR8XUSBHcfaznDMaKF2I8R0XIzIVYOGbKIcx2YDSA2XaUBV/zwZPqAyb8sZlu7ZMiVkG3cikOjpbYZ8HcJgqoJTbl6zme3CnPvzof+9dap9mCoy7TZ3qNBlDxvqm4cT25BzJwqhOy90fuAYVLEffE+hg44PK63NwX6OV2CceS823R+yL0OVo4enxfmatnfUeI+bgGcLcvwErYelMpZjhV5MxL8H6KLfmnbBRsKFz7uS1lb9FRBIHL9q02zhdsbcyS3x6cR8y5tKaj2LWOwzcAioHFquhPFyuxAuRHjGKZ9yAUsN3iW8bmq2GIsdjA0ZCcNVOwhFA0FDDzHhALB7Fwws08BXzRy5/51hC3csX8OX3st0Z+RY4163t17OEbgD9xKf6lDZIPJzuxS/45uwoXPppKzi+nJ4ZY7OJi3goVTSqO4wMpG7pSLPYYrf5xfI1cylGy1XDX+LwiR806juJz+AZAIfFTl11Mq/cMX2KIrQ5KOIaruOlVyDadPdGDmfJHkF4cP+risLZpFcnNSLMgh01nz3dcFd+Rc3bQQwg7cPgGwCopJk5e5sL1fL1zEj1wvUvPiC8xzHtQc8V+5L3/rmEpTw3nEse+dtrmvhkG+zF2wK/i0A2AK3hcyNfpUfjTxDVeh3KeKEh7vU/uQSwcTlU9zV25yQNiInQg1iPnuLAJ14Yv6RTTO6Zybfmt/9K6xm340g69zr6qAZzP1zt43XIt09kXvsnueS7YnNt2U5YibMDKncsGNEWKOMd1g18aigkLxnfmLizrq0zdDYBb8PP0+I/5K3at5oRZu5a7PXLH4vPTa1T7jLYVIcz7BIV7MerZHYozjWm0A6V9jFyHuGIHuhrA2a788S34Q7diJZuFhnJcx2Yfh/no4DEjVApGMDM+BB/LfDLOhyX/ih+35zHyEWVLzINMjnLUMazjY8I+70PM2tUAYpIhjx0YO/CZO9DVAG7hz0T9Je02PXR7b4LPmc617JGOm2ntqs4XiB4zuwSSAclu9LHMJ+N05uQUPz6jx0g6VyhjHmRyVIQOly/Zga4GwN7wrbGVvd3Z8j+NXJr/Ug6OVpBzKeZ2O61ay8keuRy/t6VW9Pa0Y59+ESYW+Otj8/hp1KvWFvMNeezA2h3obgAk5qoPmL8Ktxull8lWsmVCutUsw6Ob6BnIZ/SntM8szlFqWPus4Mn6ztzPVXzPLHWkqxpAinBLHber8ZdWdr8R/kUaak+5mHMyXab5nQixcMivZcx9Yx/yJO4ycnpy5riwCdyea773mMq19teTljW/MlfLur7R99ANQG8IhRxfuW5WhCo65vJlxJcY5j2ouVVXbo1LeWo4lzj2tZ/3pZ+xvzLXLPEQoh04fAPgCs4VvuWUwZcYYqPjbRJ15c41E/QgRSq9OFI+sY4rM80r1m8lw02OmI8mFuv2lt+Rc+9j+kT+wzcAf9KqqEobLR9OdGJLviWbrtjw9TQSYoglh7iYt6L0BzEcH8hxlmJTMa3+KY4lXSlHybbEW2t/RY7atbzSL5fr8A2AQmbxFBSgqErABxCjWOY9CIVrtxMtV3HlCTEWGzikrBhZs4qak3XNlZJYOEgLJ9zMU8AXvfyZbw1xK1fMn9PHfj3yUu4ezn8h5vANIN5kiruE2H+trAKmoMESHz4AP8UybwGFGgrWvudoiUv5UlSB63Kq/glyjy/p9uBMHW9Oxz7kbN+s/7gG8I436/TzIDfFLSADyYzIP+7VBUdMDDWBWN8qtxT/s0jOk66Y0waPB5fdDhnXM4cJ4/n2HRgNoOEtUGEzhjDOaWACOsHETZ5qAhRxKyExAI6WWF+gj8Jtif7r6zk891/PodlrB0q8owGUdqdgU7FrLLiuMlHAgGIWREjvAZJlZyQGyNYy+kL1BdzCga+P9ZzYauE5amPktyZWHP/6OBrAh7zDFDNguRQ44KdOwBxgwwcwXwMKFsBBIQnIJciPET84APMevCu2Z62fGDMawIe9axR3CVsfDgUIxEthlyA/YoDkMR5zB0YDOOb7crhVUcxCbnGyM+Z8hv61O7CU7X8AAAD//3s/MPYAAAAGSURBVAMADftva8Wc4DoAAAAASUVORK5CYII=",
      frameWidth: 32,
      frameHeight: 32,
      frames: 8,
      drawSize: 88
    },
    pop: {
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAgCAYAAAD9qabkAAADvElEQVR4AeyZi7qqIBCF8byj+yHzIT38kIpYWiAFufa3J2VgLiyYJdk/oz8hIAQui4AI4LJLr4kLAWNEANoFQuDCCIgALrz4mvq1EWD2IgBQkAiBiyIgArjowmvaQgAERACgIBECF0VABHDRhU+d9njrR2Syn+65IpNe17oRmLITAUxI6HqIAAXe/Q0dsgwe3C06hDFOoY8mEBABNLFM6yQpsljWI8q0KPBHnsebGSf9NIb8Jp2u9SIgAqh3bTaZjaNZjt893cvTl9Y3iq77M/ZEYDrir2UwITGs+9SqBQERQMZKsMG99PMTMMPdC6a9cU/Y3g/1xTfMxUff2SSQ6o/cjLkn6tPVZyUIhGk0SwBT4bFBkXBSpe+Jh/gNbjd53xvyKRnXxRuWp2rXLYUfxj2TBIiJv9D/O/fY4uMdm3hsaVzjeFdrN0cAbCjERE8Xryu/fKsNaWvf2OL3UfviJODjGEPxj2P/8NTxTG8a/fMniUaTbyDt5ghggylFeFeuivOuO/PiSKa/GVf0rvCD4C5Q3HbK7A/i8jSlGBAcQgJcY0HPWGzivvfby4njfVtZtIBAFgHYN1Ij8rWJboqwTAEu87Mv3ewxfGkHd/fQxUnIvggMom5uOQEgm44EBWSDJJjOJpDR3Ei4KY1nQkpNm8TJZxFA7Ow6bUsEm8neGWCjP1fRdabb8+hOAE/eD+zZ1dqXS0C1zquWvLIIwP7+0yGfnUxQfDyNkTmBoG/WnXczb8ZnYTYnkvNiy5MQKIFAFgGUSOjI51yEDwbu9T0YnqiKq9+2ISEn9kfxv8dv5xODOTOO0Xynf/Voz1hsnHHGB35SzDm2I9im+sBWUh6B5ggASPzmtoVHw8ngfx9392U/PMkMPogren9rzGBz2D+eTyNTrxzvU20/aQdGyCdjKtYxAo9GNEkATIQNBhF4KVt4xAuF2Ibit0XvC3+w34TK5sA8X3maMoaxYb6p9/jBX6o9tvhItZddeQSaJYDy0OxHYGNDBMj+yPN6iUlRIbFXdAhj4r6cdo6/HNucnGX7OgIigNexqmIkRYVQ7KGgQ6pIspIkpvcQlaRTZRoigCqX5Tgpij2UY4u8ERQTcuQFUjoa86n+T57OPjWn1DjP7EQAz5CRfoUAxYRQ4Miq0zbQIZCSbeq/EQREAI0sVC1pUuBInA86JNarXTcCIoC610fZCYGiCIgAisIr50Lg+wjsZSAC2ENHfULgxxEQAfz4Amt6QmAPARHAHjrqEwI/joAI4McXWNO7NgJHs/8PAAD//9ZXOWMAAAAGSURBVAMAMYhRUNkYg3MAAAAASUVORK5CYII=",
      frameWidth: 32,
      frameHeight: 32,
      frames: 8,
      drawSize: 72
    },
    flash: {
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAgCAYAAADtwH1UAAABRklEQVR4AeyYgQrDIAxEt/7/P29kMJCQmEbOVNsTHFWTnN5bt9LjNdg+qg2WeXzaMIA7Oae+S78h+ny/oupDNJYBoPY2fSiHX6EvA2AFM67YAwFc4XqjSQCNGVdcugCiH2G92Wy8ztfjN7jp+u3YkmrXEdeehgsAIcoasQMEEHs0NYIAptobF38mgNiXsggCKLPaFiIA25ey2S0BeI+8Za4BhY6qw1TpAL0pKbXlHVDiTJEIARQZ7ckQgOdM0fxhvaOQObS+1LQ6Wme3elveARZImdvNfNnvlgBk43fphQDuYhn2HASA9TNdjQDSlmETCADrZ7oaAaQtwya4AOSxrtf1Nnqxsqbjo7H37mh0vqdn1ezFj6x5Gi6AERHm5B0ggLxn0AwCgNqZL7YMAPmfqOx5q+ZkLANgzvHOVbXAn8uMo/4RnsYXAAD//8G/AJkAAAAGSURBVAMAGyOoQBtzNDgAAAAASUVORK5CYII=",
      frameWidth: 32,
      frameHeight: 32,
      frames: 3,
      drawSize: 96
    }
  },
  rules: [
    { when: { attacker: { piece: "q" } }, timeline: "queen-shockwave" },
    { when: { attacker: { piece: "r" } }, timeline: "rook-impact" },
    { when: { attacker: { piece: "n" } }, timeline: "dagger-kill" },
    { when: { attacker: { piece: "b" } }, timeline: "slash-kill" },
    { when: { attacker: { piece: "p" } }, timeline: "pawn-pop" },
    { when: { attacker: { piece: "*" } }, timeline: "kill-impact" }
  ],
  timelines: {
    "kill-impact": {
      maxDurationMs: 2000,
      impactAtMs: 680,
      layers: [
        {
          id: "crosshair",
          sheet: "crosshair",
          frames: [0, 1, 2, 3, 4, 5],
          frameDurations: [120, 120, 150, 180, 120, 80],
          keyframes: [
            { t: 0,   ref: "victim.at", scale: 1.8, alpha: 0 },
            { t: 60,  ref: "victim.at", scale: 1.5, alpha: 0.9 },
            { t: 550, ref: "victim.at", scale: 0.9, alpha: 1 },
            { t: 720, ref: "victim.at", scale: 0.7, alpha: 0.7 },
            { t: 900, ref: "victim.at", scale: 0.4, alpha: 0 }
          ]
        },
        {
          id: "flash",
          sheet: "flash",
          frames: [0, 1, 2],
          frameDurations: [50, 45, 60],
          keyframes: [
            { t: 650, ref: "victim.at", scale: 0.9, alpha: 0 },
            { t: 680, ref: "victim.at", scale: 1.0, alpha: 1 },
            { t: 700, ref: "victim.at", scale: 1.05, alpha: 1 },
            { t: 800, ref: "victim.at", scale: 1.1, alpha: 0 }
          ]
        },
        {
          id: "impact",
          sheet: "explosion",
          frames: [0, 1, 2, 3, 4, 5, 6, 7],
          frameDurations: [60, 80, 120, 160, 200, 240, 280, 360],
          keyframes: [
            { t: 680,  ref: "victim.at", scale: 0.3, alpha: 0 },
            { t: 750,  ref: "victim.at", scale: 1.6, alpha: 1 },
            { t: 850,  ref: "victim.at", scale: 1.2, alpha: 1 },
            { t: 1300, ref: "victim.at", scale: 2.4, alpha: 1 },
            { t: 2000, ref: "victim.at", scale: 3.2, alpha: 0 }
          ]
        }
      ]
    },
    "dagger-kill": {
      maxDurationMs: 2025,
      impactAtMs: 680,
      layers: [
        {
          id: "crosshair",
          sheet: "crosshair",
          frames: [0, 1, 2, 3, 4, 5],
          frameDurations: [120, 120, 150, 180, 120, 80],
          keyframes: [
            { t: 0,   ref: "victim.at", scale: 1.8, alpha: 0 },
            { t: 60,  ref: "victim.at", scale: 1.5, alpha: 0.9 },
            { t: 550, ref: "victim.at", scale: 0.9, alpha: 1 },
            { t: 720, ref: "victim.at", scale: 0.7, alpha: 0.7 },
            { t: 900, ref: "victim.at", scale: 0.4, alpha: 0 }
          ]
        },
        {
          id: "flash",
          sheet: "flash",
          frames: [0, 1, 2],
          frameDurations: [50, 45, 60],
          keyframes: [
            { t: 650, ref: "victim.at", scale: 0.9, alpha: 0 },
            { t: 680, ref: "victim.at", scale: 1.0, alpha: 1 },
            { t: 700, ref: "victim.at", scale: 1.05, alpha: 1 },
            { t: 800, ref: "victim.at", scale: 1.1, alpha: 0 }
          ]
        },
        {
          id: "slash",
          sheet: "dagger",
          frames: [0, 1, 2, 3, 4, 5, 6, 7],
          frameDurations: [60, 80, 60, 160, 220, 220, 280, 360],
          keyframes: [
            { t: 680,  ref: "victim.at", scale: 0.8, alpha: 0 },
            { t: 740,  ref: "victim.at", scale: 1.0, alpha: 0.4 },
            { t: 880,  ref: "victim.at", scale: 1.3, alpha: 1 },
            { t: 980,  ref: "victim.at", scale: 1.2, alpha: 0.95 },
            { t: 1400, ref: "victim.at", scale: 1.6, alpha: 0.7 },
            { t: 2025, ref: "victim.at", scale: 2.0, alpha: 0 }
          ]
        }
      ]
    },
    "slash-kill": {
      maxDurationMs: 2020,
      impactAtMs: 680,
      layers: [
        {
          id: "crosshair",
          sheet: "crosshair",
          frames: [0, 1, 2, 3, 4, 5],
          frameDurations: [120, 120, 150, 180, 120, 80],
          keyframes: [
            { t: 0,   ref: "victim.at", scale: 1.8, alpha: 0 },
            { t: 60,  ref: "victim.at", scale: 1.5, alpha: 0.9 },
            { t: 550, ref: "victim.at", scale: 0.9, alpha: 1 },
            { t: 720, ref: "victim.at", scale: 0.7, alpha: 0.7 },
            { t: 900, ref: "victim.at", scale: 0.4, alpha: 0 }
          ]
        },
        {
          id: "flash",
          sheet: "flash",
          frames: [0, 1, 2],
          frameDurations: [50, 45, 60],
          keyframes: [
            { t: 650, ref: "victim.at", scale: 0.9, alpha: 0 },
            { t: 680, ref: "victim.at", scale: 1.0, alpha: 1 },
            { t: 700, ref: "victim.at", scale: 1.05, alpha: 1 },
            { t: 800, ref: "victim.at", scale: 1.1, alpha: 0 }
          ]
        },
        {
          id: "slash",
          sheet: "slash",
          frames: [0, 1, 2, 3, 4, 5, 6, 7],
          frameDurations: [40, 55, 30, 65, 85, 95, 110, 130],
          keyframes: [
            { t: 680,  ref: "victim.at", scale: 0.9, alpha: 0, rotationRef: "attacker.angle" },
            { t: 730,  ref: "victim.at", scale: 1.1, alpha: 0.5, rotationRef: "attacker.angle" },
            { t: 870,  ref: "victim.at", scale: 1.4, alpha: 1 },
            { t: 980,  ref: "victim.at", scale: 1.3, alpha: 0.95 },
            { t: 1400, ref: "victim.at", scale: 1.7, alpha: 0.7 },
            { t: 2020, ref: "victim.at", scale: 2.1, alpha: 0 }
          ]
        }
      ]
    },
    "queen-shockwave": {
      maxDurationMs: 2200,
      impactAtMs: 680,
      layers: [
        {
          id: "crosshair",
          sheet: "crosshair",
          frames: [0, 1, 2, 3, 4, 5],
          frameDurations: [120, 120, 150, 180, 120, 80],
          keyframes: [
            { t: 0,   ref: "victim.at", scale: 1.8, alpha: 0 },
            { t: 60,  ref: "victim.at", scale: 1.5, alpha: 0.9 },
            { t: 550, ref: "victim.at", scale: 0.9, alpha: 1 },
            { t: 720, ref: "victim.at", scale: 0.7, alpha: 0.7 },
            { t: 900, ref: "victim.at", scale: 0.4, alpha: 0 }
          ]
        },
        {
          id: "flash",
          sheet: "flash",
          frames: [0, 1, 2],
          frameDurations: [50, 45, 60],
          keyframes: [
            { t: 650, ref: "victim.at", scale: 0.9, alpha: 0 },
            { t: 680, ref: "victim.at", scale: 1.0, alpha: 1 },
            { t: 700, ref: "victim.at", scale: 1.05, alpha: 1 },
            { t: 800, ref: "victim.at", scale: 1.1, alpha: 0 }
          ]
        },
        {
          id: "shockwave",
          sheet: "shockwave",
          frames: [0, 1, 2, 3, 4, 5, 6, 7],
          frameDurations: [50, 60, 35, 55, 75, 90, 110, 130],
          keyframes: [
            { t: 680,  ref: "victim.at", scale: 0.8, alpha: 0 },
            { t: 740,  ref: "victim.at", scale: 1.1, alpha: 0.7 },
            { t: 860,  ref: "victim.at", scale: 1.4, alpha: 1 },
            { t: 1000, ref: "victim.at", scale: 1.5, alpha: 1 },
            { t: 1600, ref: "victim.at", scale: 2.0, alpha: 0.6 },
            { t: 2200, ref: "victim.at", scale: 2.8, alpha: 0 }
          ]
        }
      ]
    },
    "rook-impact": {
      maxDurationMs: 2200,
      impactAtMs: 680,
      layers: [
        {
          id: "crosshair",
          sheet: "crosshair",
          frames: [0, 1, 2, 3, 4, 5],
          frameDurations: [120, 120, 150, 180, 120, 80],
          keyframes: [
            { t: 0,   ref: "victim.at", scale: 1.8, alpha: 0 },
            { t: 60,  ref: "victim.at", scale: 1.5, alpha: 0.9 },
            { t: 550, ref: "victim.at", scale: 0.9, alpha: 1 },
            { t: 720, ref: "victim.at", scale: 0.7, alpha: 0.7 },
            { t: 900, ref: "victim.at", scale: 0.4, alpha: 0 }
          ]
        },
        {
          id: "flash",
          sheet: "flash",
          frames: [0, 1, 2],
          frameDurations: [50, 45, 60],
          keyframes: [
            { t: 650, ref: "victim.at", scale: 0.9, alpha: 0 },
            { t: 680, ref: "victim.at", scale: 1.0, alpha: 1 },
            { t: 700, ref: "victim.at", scale: 1.05, alpha: 1 },
            { t: 800, ref: "victim.at", scale: 1.1, alpha: 0 }
          ]
        },
        {
          id: "impact",
          sheet: "explosion",
          frames: [0, 1, 2, 3, 4, 5, 6, 7],
          frameDurations: [50, 60, 80, 120, 160, 200, 240, 300],
          keyframes: [
            { t: 680,  ref: "victim.at", scale: 0.4, alpha: 0 },
            { t: 750,  ref: "victim.at", scale: 2.0, alpha: 1 },
            { t: 900,  ref: "victim.at", scale: 1.6, alpha: 1 },
            { t: 1400, ref: "victim.at", scale: 2.8, alpha: 1 },
            { t: 2200, ref: "victim.at", scale: 3.8, alpha: 0 }
          ]
        }
      ]
    },
    "pawn-pop": {
      maxDurationMs: 1600,
      impactAtMs: 680,
      layers: [
        {
          id: "crosshair",
          sheet: "crosshair",
          frames: [0, 1, 2, 3, 4, 5],
          frameDurations: [120, 120, 150, 180, 120, 80],
          keyframes: [
            { t: 0,   ref: "victim.at", scale: 1.8, alpha: 0 },
            { t: 60,  ref: "victim.at", scale: 1.5, alpha: 0.9 },
            { t: 550, ref: "victim.at", scale: 0.9, alpha: 1 },
            { t: 720, ref: "victim.at", scale: 0.7, alpha: 0.7 },
            { t: 900, ref: "victim.at", scale: 0.4, alpha: 0 }
          ]
        },
        {
          id: "flash",
          sheet: "flash",
          frames: [0, 1, 2],
          frameDurations: [50, 45, 60],
          keyframes: [
            { t: 650, ref: "victim.at", scale: 0.9, alpha: 0 },
            { t: 680, ref: "victim.at", scale: 1.0, alpha: 1 },
            { t: 700, ref: "victim.at", scale: 1.05, alpha: 1 },
            { t: 800, ref: "victim.at", scale: 1.1, alpha: 0 }
          ]
        },
        {
          id: "pop",
          sheet: "pop",
          frames: [0, 1, 2, 3, 4, 5, 6, 7],
          frameDurations: [30, 40, 25, 50, 65, 75, 90, 110],
          keyframes: [
            { t: 680,  ref: "victim.at", scale: 0.6, alpha: 0 },
            { t: 730,  ref: "victim.at", scale: 0.9, alpha: 0.8 },
            { t: 850,  ref: "victim.at", scale: 1.1, alpha: 1 },
            { t: 1000, ref: "victim.at", scale: 1.2, alpha: 0.9 },
            { t: 1600, ref: "victim.at", scale: 1.6, alpha: 0 }
          ]
        }
      ]
    }
  }
};

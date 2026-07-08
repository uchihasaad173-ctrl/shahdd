/* ============================================================
   SHAHD'S ISLAND — CONFIG
   Edit this file to swap in your real photos, videos, music
   and letters. Nothing else needs to change.
   ------------------------------------------------------------
   • memories: id, scene, kind (photo|video|polaroid|bottle|
     shell|leaf|palm), src, caption, when, holder (rope|float|
     shell|bottle|palm|leaf|frame), unlockedBy (optional game id)
   • letters: id, scene, title, body (array of paragraphs),
     signature
   • tracks: name, src (mp3/ogg), scenes it plays in (indexes),
     tempo (optional)
   ============================================================ */
window.ISLAND = {
  friend: "Shahd",
  gifter: "your favorite adventurer",
  finale: {
    title: "for shahd — always",
    lines: [
      "Shahd,",
      "you are the reason my summers have chapters instead of just days.",
      "here is a small island i built out of everything i remember.",
      "come back to it whenever you need to remember too."
    ]
  },

  // ------- MEMORIES (photos, videos, polaroids, shells...) -------
  // Replace `src` with your own image / video URLs (local paths
  // like ./memories/beach1.jpg also work). "kind:video" expects
  // an mp4/webm. Everything else is treated as an image.
  memories: [
    // OCEAN
    { id:"m1", scene:"ocean", kind:"bottle",   src:"./media/M4.jpg",
      caption:"the first day the sea learned our names.", when:"june", holder:"bottle" },
    { id:"m2", scene:"ocean", kind:"bottle",    src:"./media/S6.jpeg",
      caption:"you said the waves sounded like laughing. they did.", when:"june 03", holder:"float" },

    // BEACH
    { id:"m3", scene:"beach", kind:"polaroid", src:"./media/M3.jpg",
      caption:"beach day #1 — sunscreen crimes committed.", when:"june 09", holder:"rope" },
    { id:"m4", scene:"beach", kind:"polaroid", src:"./media/S4.jpeg",
      caption:"you built a sandcastle. it fell. we laughed harder.", when:"june 09", holder:"rope" },
    { id:"m5", scene:"beach", kind:"shell",    src:"./media/S9.jpeg",
      caption:"a shell for every song we couldn't stop replaying.", when:"june", holder:"shell" },
    
    // JUNGLE
    { id:"m7",  scene:"jungle", kind:"photo",    src:"./media/M5.jpg",
      caption:"the day we got lost on purpose.", when:"july 02", holder:"leaf" },
    { id:"m8",  scene:"jungle", kind:"polaroid", src:"./media/S2.jpeg",
      caption:"you named every bird. none of them agreed.", when:"july 02", holder:"palm" },
    { id:"m9",  scene:"jungle", kind:"photo",    src:"./media/S7.jpeg",
      caption:"jungle karaoke — no witnesses.", when:"july 04", holder:"palm" },

    // WATERFALL
    { id:"m10", scene:"waterfall", kind:"photo", src:"./media/M44.jpg",
      caption:"we screamed and the water screamed back.", when:"july 11", holder:"leaf" },
    { id:"m11", scene:"waterfall", kind:"video", src:"./media/S16.jpeg",
      caption:"proof the mist tastes like flowers.", when:"july 11", holder:"frame" },

    // CAVE
    { id:"m12", scene:"cave", kind:"polaroid", src:"./media/M11.jpg",
      caption:"flashlight face — instant blackmail.", when:"july 15", holder:"rope" },
    { id:"m13", scene:"cave", kind:"photo",    src:"./media/S22.jpeg",
      caption:"the cave echo did your laugh better than mine.", when:"july 15", holder:"rope",
      unlockedBy:"shells" },

    // VOLCANO
    { id:"m14", scene:"volcano", kind:"photo", src:"./media/M6.jpg",
      caption:"top of the world with my favorite person on it.", when:"july 22", holder:"palm" },
    { id:"m15", scene:"volcano", kind:"polaroid", src:"./media/S3.jpeg",
      caption:"windswept hair, unearned confidence.", when:"july 22", holder:"palm" },

    // SUNSET
    { id:"m16", scene:"sunset", kind:"photo", src:"./media/S12.jpeg",
      caption:"the sky went pink because you told it to.", when:"august 04", holder:"leaf" },
    { id:"m17", scene:"sunset", kind:"polaroid", src:"./media/S5.jpeg",
      caption:"we didn't talk. we didn't need to.", when:"august 04", holder:"rope" },
    { id:"m18", scene:"sunset", kind:"video", src:"./media/M12.jpg",
      caption:"press play. hear the summer.", when:"august 04", holder:"frame" },

    // STARRY FINALE
    { id:"m19", scene:"starry", kind:"photo", src:"./media/F1.jpeg",
      caption:"a sky big enough to hold everything we didn't say.", when:"august 12", holder:"float" },
    { id:"m20", scene:"starry", kind:"polaroid", src:"./media/F2.jpeg",
      caption:"one more picture. always one more.", when:"august 12", holder:"rope" },
    { id:"m21", scene:"starry", kind:"shell", src:"./media/F3.jpeg",
      caption:"a shell that hums when you miss me.", when:"forever", holder:"shell" },
    { id:"m22", scene:"starry", kind:"photo", src:"./media/S14.jpeg",
      caption:"bonus memory — you earned it, shell hunter.", when:"???", holder:"leaf",
      unlockedBy:"shells" }
  ],

  // ------- LETTERS / BOTTLES -------
  letters: [
    { id:"L1", scene:"ocean",
      title:"a note tucked inside a bottle",
      body:[
        "shahd",
        "i started writing this seven times. the ocean kept taking the drafts.",
        "so here's the short version: knowing you is the easiest thing i've ever done."
      ],
      signature:"— from the other half of every inside joke" },

    { id:"L2", scene:"beach",
      title:"beach receipt",
      body:[
        "one (1) friendship, salt-cured and sun-approved.",
        "no returns accepted. no refunds needed."
      ],
      signature:"— management" },

    { id:"L3", scene:"jungle",
      title:"trailhead sign",
      body:[
        "warning: this path leads to a person who will roast you gently for the rest of your life.",
        "you already know her. keep going."
      ],
      signature:"— the jungle" },

    { id:"L4", scene:"waterfall",
      title:"pinned to a wet leaf",
      body:[
        "some people are waterfalls.",
        "loud, ridiculous, refuses to be quiet, and you cannot leave without getting a little bit changed.",
        "that's you. never stop it."
      ],
      signature:"— an admirer with soggy shoes" },

    { id:"L5", scene:"cave",
      title:"scribbled on the cave wall",
      body:[
        "we were here.",
        "we screamed. we echoed. we drew stick figures.",
        "the cave keeps everything. so do i."
      ],
      signature:"— the archaeologists of us" },

    { id:"L6", scene:"volcano",
      title:"a note weighted with a warm stone",
      body:[
        "some friendships are simmering.",
        "ours is molten. loud, bright, occasionally alarming, entirely alive.",
        "wouldn't trade the heat for anything."
      ],
      signature:"— your co-conspirator" },

    { id:"L7", scene:"sunset",
      title:"folded into a plumeria",
      body:[
        "if the sunset had a name, it would probably still be yours.",
        "you make ordinary evenings feel like something a movie stole from us."
      ],
      signature:"— guilty of staring" },

    { id:"L8", scene:"starry",
      title:"the last letter, saved for the stars",
      body:[
        "shahd,",
        "there's a treasure at the end of this island. it isn't gold.",
        "it's the fact that you exist, and you're mine to laugh with.",
        "open the chest whenever you're ready. i'll be right here."
      ],
      signature:"— always, your friend" }
  ],

  // ------- MUSIC -------
  // Free-to-use audio. Replace src with your own tracks anytime.
  tracks: [
    { name:"ukulele shores",       src:"A1.mpeg" },
    { name:"jungle heartbeat",     src:"A2.mpeg" },
    { name:"waterfall breathing",  src:"A3.mpeg" },
  ]
};

      const input = document.getElementById("languageTranslator");
      const english = document.getElementById("English");
      const nepali = document.getElementById("Nepali");
      const hindi = document.getElementById("Hindi");
      const translate = document.getElementById("buttonForTranslate");
      const output = document.getElementById("translatedText");
      const targetSelect = document.getElementById("targetLanguage");
      const auto = document.getElementById("auto");

      function detectScript(text) {
        const devanagari = /[\u0900-\u097F]/; 
        return devanagari.test(text) ? "deva" : "latin"; 
      }

      translate.addEventListener("click", async () => {

        const text = input.value.trim();
        
        if (!text) {
          output.innerText = "Please enter text to translate.";
          return;
        }

        // determine source 
        // if somethings is checked then the form should store that value in the form variable ; 

        let from;
        if (english.checked) from = "en";

        else if (nepali.checked) from = "ne";
        
        else if (hindi.checked) from = "hi";

        else {
          // auto
          const script = detectScript(text);

          if (script === "deva") {
            // Devanagari detected — can't tell Nepali vs Hindi reliably.
            // Default to Nepali ('ne') but user should choose explicitly if needed.
            from = "ne";
            output.innerText =
              "Devanagari text detected — assuming Nepali. Change source if it's Hindi.";
          } else {
            from = "en";
          }
        }

        const to = targetSelect.value;

        if (from === to) {
          output.innerText =
            "Source and target are the same; choose a different target.";
          return;
        }

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=${from}|${to}`;
        output.innerText = "Translating...";

        try {
          const res = await fetch(url);

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          
          const translated =
            data?.responseData?.translatedText ?? "No translation found.";
          output.innerText = translated;
        } 
        catch (err) {
          console.error(err);
          output.innerText = "Translation failed. Please try again later.";
        }

      });
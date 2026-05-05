// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import translationEN from '../resources/translation/en.json';
import translationDE from '../resources/translation/de.json';

// the translations
const resources = {
  en: {
    translation: translationEN
  },
  de: {
    translation: translationDE
  },
  fake: {
    translation: createFake(translationEN)
  },
  keysasvalues: {
    translation: createKeysAsValues(translationEN)
  }
};

i18n
  .use(detector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;

interface KeyValue {
  [key: string]: string | KeyValue
}

function createFake(translations: KeyValue) {
  const engMulti: KeyValue = {
    "a": "ä",
    "b": "ɓ",
    "c": "ċ",
    "d": "ḋ",
    "e": "ẹ",
    "f": "ḟ",
    "g": "ġ",
    "h": "ḣ",
    "i": "ï",
    "j": "ĵ",
    "k": "ḱ",
    "l": "ḷ",
    "m": "ḿ",
    "n": "ń",
    "o": "ỏ",
    "p": "ṕ",
    "q": "ɋ",
    "r": "ŕ",
    "s": "ʂ",
    "t": "ṫ",
    "u": "ü",
    "v": "ṽ",
    "w": "ẃ",
    "x": "ҳ",
    "y": "ý",
    "z": "ż",
    "A": "Ä",
    "B": "Ḃ",
    "C": "Ċ",
    "D": "Ḋ",
    "E": "Ẹ",
    "F": "Ḟ",
    "G": "Ġ",
    "H": "Ḣ",
    "I": "Ï",
    "J": "Ĵ",
    "K": "Ḱ",
    "L": "Ḷ",
    "M": "Ḿ",
    "N": "Ń",
    "O": "Ỏ",
    "P": "Ṕ",
    "Q": "Ɋ",
    "R": "Ŕ",
    "S": "Ś",
    "T": "Ṫ",
    "U": "Ü",
    "V": "Ṽ",
    "W": "Ẃ",
    "X": "Ҳ",
    "Y": "Ý",
    "Z": "Ż"
  };

  function replaceString(str: string) {
    let ret = "";
    let brackets = 0;
    for(let i=0; i<str.length; i++) {
        const ch = str.charAt(i);
        if(brackets === 0 && ch in engMulti) {
            ret += engMulti[ch];
        }
        else {
            if(ch === "{") brackets++;
            if(ch === "}") brackets--;
            ret += ch;
        }
    }
    return "[[" + ret + "]]";
  }

  function replaceRecursive(obj: KeyValue) {
    Object.keys(obj).forEach((key:string) => {
      const element = obj[key];
      if(typeof element === "string") {
        obj[key] = replaceString(element);
      }
      else if(typeof element === "object" && !Array.isArray(element)) {
        replaceRecursive(element);
      }
    })
  }

  translations = JSON.parse(JSON.stringify(translations));
  replaceRecursive(translations);
  return translations;
}

function createKeysAsValues(translations: KeyValue) {
  function replaceRecursive(obj: KeyValue, prefix: string) {
    Object.keys(obj).forEach((key:string) => {
      const element = obj[key];
      if(typeof element === "string") {
        obj[key] = "[[" + prefix + key + "]]";
      }
      else if(typeof element === "object" && !Array.isArray(element)) {
        replaceRecursive(element, prefix + key + ".");
      }
    })
  }

  translations = JSON.parse(JSON.stringify(translations));
  replaceRecursive(translations, "");
  return translations;
}

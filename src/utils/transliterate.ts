/**
 * Uzbek Cyrillic to Latin Transliteration Utility
 * Automatically converts Cyrillic text input to standard Uzbek Latin script.
 */

const CYRILLIC_VOWELS = new Set(['А', 'Е', 'Ё', 'И', 'О', 'У', 'Э', 'Ю', 'Я', 'Ў', 'а', 'е', 'ё', 'и', 'о', 'у', 'э', 'ю', 'я', 'ў']);

export function cyrillicToLatin(text: string): string {
  if (!text) return '';

  let result = '';
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : ' ';
    const nextChar = i < len - 1 ? text[i + 1] : ' ';
    const isWordStart = i === 0 || /[\s\p{P}\d]/u.test(prevChar);
    const prevIsVowel = CYRILLIC_VOWELS.has(prevChar);
    const isNextUpper = nextChar >= 'А' && nextChar <= 'Я';

    // Handle 'Е' / 'е' (Ye/ye at start of word or after vowels, E/e after consonants)
    if (char === 'Е') {
      if (isWordStart || prevIsVowel) {
        result += isNextUpper ? 'YE' : 'Ye';
      } else {
        result += 'E';
      }
      continue;
    }
    if (char === 'е') {
      if (isWordStart || prevIsVowel) {
        result += 'ye';
      } else {
        result += 'e';
      }
      continue;
    }

    // Handle 'Ц' / 'ц' (Ts/ts)
    if (char === 'Ц') {
      if (isWordStart) {
        result += isNextUpper ? 'S' : 'S';
      } else {
        result += isNextUpper ? 'TS' : 'Ts';
      }
      continue;
    }
    if (char === 'ц') {
      if (isWordStart) {
        result += 's';
      } else {
        result += 'ts';
      }
      continue;
    }

    // Multi-char and special character mappings
    switch (char) {
      // Compound vowels / consonants (Upper)
      case 'Ё':
        result += isNextUpper ? 'YO' : 'Yo';
        break;
      case 'Ю':
        result += isNextUpper ? 'YU' : 'Yu';
        break;
      case 'Я':
        result += isNextUpper ? 'YA' : 'Ya';
        break;
      case 'Ч':
        result += isNextUpper ? 'CH' : 'Ch';
        break;
      case 'Ш':
      case 'Щ':
        result += isNextUpper ? 'SH' : 'Sh';
        break;
      case 'Ў':
        result += "O'";
        break;
      case 'Ғ':
        result += "G'";
        break;
      case 'Қ':
        result += 'Q';
        break;
      case 'Ҳ':
        result += 'H';
        break;
      case 'Х':
        result += 'X';
        break;
      case 'Ж':
        result += 'J';
        break;

      // Compound vowels / consonants (Lower)
      case 'ё':
        result += 'yo';
        break;
      case 'ю':
        result += 'yu';
        break;
      case 'я':
        result += 'ya';
        break;
      case 'ч':
        result += 'ch';
        break;
      case 'ш':
      case 'щ':
        result += 'sh';
        break;
      case 'ў':
        result += "o'";
        break;
      case 'ғ':
        result += "g'";
        break;
      case 'қ':
        result += 'q';
        break;
      case 'ҳ':
        result += 'h';
        break;
      case 'х':
        result += 'x';
        break;
      case 'ж':
        result += 'j';
        break;

      // Standard Cyrillic Letters (Upper)
      case 'А':
        result += 'A';
        break;
      case 'Б':
        result += 'B';
        break;
      case 'В':
        result += 'V';
        break;
      case 'Г':
        result += 'G';
        break;
      case 'Д':
        result += 'D';
        break;
      case 'З':
        result += 'Z';
        break;
      case 'И':
        result += 'I';
        break;
      case 'Й':
        result += 'Y';
        break;
      case 'К':
        result += 'K';
        break;
      case 'Л':
        result += 'L';
        break;
      case 'М':
        result += 'M';
        break;
      case 'Н':
        result += 'N';
        break;
      case 'О':
        result += 'O';
        break;
      case 'П':
        result += 'P';
        break;
      case 'Р':
        result += 'R';
        break;
      case 'С':
        result += 'S';
        break;
      case 'Т':
        result += 'T';
        break;
      case 'У':
        result += 'U';
        break;
      case 'Ф':
        result += 'F';
        break;
      case 'Э':
        result += 'E';
        break;
      case 'Ъ':
      case 'ъ':
        result += "'";
        break;
      case 'Ь':
      case 'ь':
        // Soft sign omitted or converted to apostrophe
        break;

      // Standard Cyrillic Letters (Lower)
      case 'а':
        result += 'a';
        break;
      case 'б':
        result += 'b';
        break;
      case 'в':
        result += 'v';
        break;
      case 'г':
        result += 'g';
        break;
      case 'д':
        result += 'd';
        break;
      case 'з':
        result += 'z';
        break;
      case 'и':
        result += 'i';
        break;
      case 'й':
        result += 'y';
        break;
      case 'к':
        result += 'k';
        break;
      case 'л':
        result += 'l';
        break;
      case 'м':
        result += 'm';
        break;
      case 'н':
        result += 'n';
        break;
      case 'о':
        result += 'o';
        break;
      case 'п':
        result += 'p';
        break;
      case 'р':
        result += 'r';
        break;
      case 'с':
        result += 's';
        break;
      case 'т':
        result += 't';
        break;
      case 'у':
        result += 'u';
        break;
      case 'ф':
        result += 'f';
        break;
      case 'э':
        result += 'e';
        break;

      default:
        result += char;
        break;
    }
  }

  return result;
}

/**
 * Checks if a string contains any Cyrillic letters
 */
export function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/u.test(text);
}

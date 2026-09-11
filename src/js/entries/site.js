import { registerModules } from "../lifecycle";
import * as backButton from "../back-button";
import * as skillHints from "../skill-hints";
import * as theme from "../theme";
import * as comments from "../comments";
import * as codeBlocks from "../code-blocks";
import * as lightbox from "../image-lightbox";
import * as fuzzyFind from "../fuzzy-find";
import * as booruSearch from "../booru-search";
import * as hacklasDisclaimer from "../hacklas/hacklas-disclaimer";
import * as hacklasShortcuts from "../hacklas/hacklas-shortcuts";
import * as hacklasHelp from "../hacklas/hacklas-help";
import * as hacklasChecklists from "../hacklas/hacklas-checklists";
import { init as initSoftNav } from "../soft-nav";

registerModules([
  backButton,
  skillHints,
  theme,
  comments,
  codeBlocks,
  lightbox,
  fuzzyFind,
  booruSearch,
  hacklasDisclaimer,
  hacklasShortcuts,
  hacklasHelp,
  hacklasChecklists,
]);
initSoftNav();

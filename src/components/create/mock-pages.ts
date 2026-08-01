export interface MockPage {
  text: string;
  illustration: string;
}

export interface MockBook {
  title: string;
  author: string;
  coverIllustration: string;
  pages: MockPage[];
}

export const mockBook: MockBook = {
  title: "The Little Firefly Who Found Her Light",
  author: "Playbook Stories",
  coverIllustration: "A tiny firefly sitting on a moonlit leaf, looking up at a starry sky filled with glowing insects. Soft watercolour style, warm pastel palette.",
  pages: [
    {
      text: "Luna the little firefly was born without her glow. While other fireflies zipped and sparkled, Luna could only blink \u2014 a tiny, lonely dot in the big dark forest.",
      illustration: "A dark forest clearing at dusk. Tiny fireflies with bright golden glows flit among the trees. In the center, a small firefly sitting on a leaf with only a faint, barely-visible flicker.",
    },
    {
      text: "\u201CYou\u2019ll never shine like us,\u201D laughed the other fireflies, zipping past in a blur of gold. Luna\u2019s antennae drooped. She tucked herself under a mushroom cap and cried tiny, silent tears.",
      illustration: "Close-up of a sad firefly under a glowing mushroom cap. Other fireflies zoom past in the background leaving golden trails. Dewdrops on the mushroom glisten like tears.",
    },
    {
      text: "Then an old wise moth named Mirlo fluttered down. \u201CYour glow isn\u2019t gone, little one,\u201D he whispered. \u201CIt\u2019s just hiding. You have to find your own light, not theirs.\u201D",
      illustration: "A majestic pale moth with intricate wing patterns perches on a twig beside a small firefly. Moonlight streams through the trees. The scene feels intimate and warm.",
    },
    {
      text: "\u201CBut how?\u201D whispered Luna. Mirlo smiled and pointed his wing toward the highest branch of the old oak. \u201CGo there at dawn. The first light will show you.\u201D",
      illustration: "A large ancient oak tree stretching toward a starry sky. A tiny firefly begins her climb up the rough bark, passing sleeping ladybugs and dewdrop webs.",
    },
    {
      text: "Luna climbed all night. She passed sleeping ladybugs and shimmering spiderwebs. Her tiny legs grew tired, but something warm was growing in her chest \u2014 a feeling she\u2019d never felt before.",
      illustration: "A tiny firefly climbing a mossy tree branch at night. Glowing mushrooms light the path below. The sky begins to show the first hints of dawn on the horizon.",
    },
    {
      text: "At the very top, as the sun broke over the mountains, Luna saw it \u2014 a million golden rays pouring across the sky. And in that light, she began to glow. Softly at first, then brighter than she ever imagined.",
      illustration: "A breathtaking sunrise over rolling mountains. A tiny firefly sits at the top of a tree, glowing brilliantly as golden light streams across the sky. The whole scene is warm and triumphant.",
    },
    {
      text: "Luna zipped back down to the forest floor, a golden comet of joy. The other fireflies gathered around, amazed. \u201CYou were right, Mirlo,\u201D she beamed. \u201CMy light was inside me all along.\u201D",
      illustration: "A joyful firefly glows brilliantly in the center of a clearing, surrounded by amazed other fireflies. A wise moth watches proudly from a branch above. Golden light fills the scene.",
    },
  ],
};

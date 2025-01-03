import { mind } from 'gradient-string';

// Generated using: https://patorjk.com/software/taag/#p=display&f=Georgia11&t=RNEF
const LOGO = `
  \`7MM"""Mq.  \`7MN.   \`7MF'\`7MM"""YMM  \`7MM"""YMM 
    MM   \`MM.   MMN.    M    MM    \`7    MM    \`7 
    MM   ,M9    M YMb   M    MM   d      MM   d   
    MMmmdM9     M  \`MN. M    MMmmMM      MM""MM   
    MM  YM.     M   \`MM.M    MM   Y  ,   MM   Y   
    MM   \`Mb.   M     YMM    MM     ,M   MM       
  .JMML. .JMM..JML.    YM  .JMMmmmmMMM .JMML.    
`;

const LOGO_WIDTH = 52;

const TAG_LINE = 'The React Native Enterprise Framework';
const MADE_BY = 'Made with ❤️  by Callstack';

export function printLogo(version: string) {
  console.log(mind(LOGO));
  console.log(padBoth(`${TAG_LINE} v${version}`, LOGO_WIDTH));
  console.log(padBoth(MADE_BY, LOGO_WIDTH));
  console.log();
}

function padBoth(text: string, width: number, padChar = ' ') {
  if (text.length >= width) return text;

  const totalPadding = width - text.length;
  const frontPadding = Math.floor(totalPadding / 2);
  return `${padChar.repeat(frontPadding)}${text}`;
}

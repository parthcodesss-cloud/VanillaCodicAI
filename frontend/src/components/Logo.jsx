import React from "react";

export default function Logo({ size = 28, bracketsColor = "var(--accent-primary)" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      {/* Golden Waffle Cone */}
      <path
        d="M50 90L26 48H74L50 90Z"
        fill="#d97706"
        stroke="#b45309"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Waffle grid lines */}
      <path d="M35 64H65" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 74H60" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M45 84H55" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M33 55L50 88" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M67 55L50 88" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />

      {/* Creamy Vanilla Scoop */}
      <path
        d="M20 48C20 25 32 12 50 12C68 12 80 25 80 48C80 50 78 52 75 52C72 52 70 49 65 49C60 49 58 52 50 52C42 52 40 49 35 49C30 49 28 52 25 52C22 52 20 50 20 48Z"
        fill="#fffbeb"
        stroke="#f59e0b"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Coding Brackets < > inside the Ice Cream scoop */}
      {/* Left Bracket < */}
      <path
        d="M38 27L28 35L38 43"
        stroke={bracketsColor}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Bracket > */}
      <path
        d="M62 27L72 35L62 43"
        stroke={bracketsColor}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Slash / */}
      <path
        d="M53 24L47 46"
        stroke={bracketsColor}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

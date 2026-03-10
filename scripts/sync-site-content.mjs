#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataPath = path.join(rootDir, "data/site-content.json");

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

validateData(data);
syncIndexHtml(data);
syncSkillMarkdown(data);

function syncIndexHtml(siteData) {
  const filePath = path.join(rootDir, "index.html");
  let source = fs.readFileSync(filePath, "utf8");

  source = replaceBlock({
    source,
    label: "human-portfolio",
    blockType: "html",
    fallbackPattern:
      /        <div class="company-list">[\s\S]*?        <button class="show-more" id="show-more-btn" onclick="toggleMore\(\)">Show more<\/button>/,
    content: renderHumanPortfolio(siteData),
  });

  source = replaceBlock({
    source,
    label: "team-home-list",
    blockType: "html",
    fallbackPattern:
      /            <div class="team-home-list">[\s\S]*?            <\/div>\n        <\/section>/,
    content: `${renderTeamHomeList(siteData)}\n        </section>`,
  });

  source = replaceBlock({
    source,
    label: "agent-team-list",
    blockType: "html",
    fallbackPattern:
      /                <div class="agent-team-list">[\s\S]*?                <\/div>\n            <\/div>\n            <div class="agent-section">/,
    content: `${renderAgentTeamList(siteData)}\n            </div>\n            <div class="agent-section">`,
  });

  source = replaceBlock({
    source,
    label: "agent-portfolio-list",
    blockType: "html",
    fallbackPattern:
      /                <div class="agent-portfolio-list">[\s\S]*?                <\/div>\n            <\/div>\n            <div class="agent-section">/,
    content: `${renderAgentPortfolioList(siteData)}\n            </div>\n            <div class="agent-section">`,
  });

  source = replaceBlock({
    source,
    label: "home-member-data",
    blockType: "js",
    fallbackPattern: /        const homeMemberData = \{[\s\S]*?        \};/,
    content: renderHomeMemberData(siteData),
  });

  writeIfChanged(filePath, source);
}

function syncSkillMarkdown(siteData) {
  const filePath = path.join(rootDir, "skill.md");
  let source = fs.readFileSync(filePath, "utf8");

  source = replacePattern(
    source,
    /\| Name \| Title \|[^\n]*\n\|[-| ]+\|\n[\s\S]*?(?=\n---\n\n## Portfolio)/,
    renderSkillTeamTable(siteData)
  );

  source = replacePattern(
    source,
    /\| Company \| Description \|[^\n]*\n\|[-| ]+\|\n[\s\S]*?(?=\n---\n\n## For Agents)/,
    renderSkillPortfolioTable(siteData)
  );

  writeIfChanged(filePath, source);
}

function renderHumanPortfolio(siteData) {
  const orderedCompanies = siteData.portfolioOrder.human.map((id) =>
    getPortfolioCompany(siteData, id)
  );
  const featured = orderedCompanies.slice(0, siteData.homeFeaturedCompanyCount);
  const more = orderedCompanies.slice(siteData.homeFeaturedCompanyCount);

  return [
    '            <div class="company-list">',
    ...featured.map((company) => indent(renderHumanPortfolioCompany(company), 16)),
    '                <div class="company-list-more" id="more-companies">',
    ...more.map((company) => indent(renderHumanPortfolioCompany(company), 20)),
    "                </div>",
    "            </div>",
    '            <button class="show-more" id="show-more-btn" onclick="toggleMore()">Show more</button>',
  ].join("\n");
}

function renderHumanPortfolioCompany(company) {
  const inner = [
    '    <div class="company-info">',
    `        <span class="company-name">${renderCompanyName(company)}</span>`,
    `        <span class="company-founders">${escapeHtml(company.founders.join(", "))}</span>`,
    "    </div>",
    `    <span class="company-desc">${escapeHtml(company.description)}</span>`,
    `    <img src="${escapeAttribute(company.image)}" alt="${escapeAttribute(company.alt)}" class="company-hover-img">`,
  ];

  if (company.url) {
    return [
      `<a href="${escapeAttribute(company.url)}" target="_blank" rel="noopener noreferrer" class="company">`,
      ...inner,
      "</a>",
    ].join("\n");
  }

  return [
    '<div class="company company-no-link">',
    ...inner,
    "</div>",
  ].join("\n");
}

function renderTeamHomeList(siteData) {
  const rows = siteData.teamOrder.home.map((memberId) =>
    indent(renderTeamHomeMember(siteData, memberId), 16)
  );

  return ['            <div class="team-home-list">', ...rows, "            </div>"].join(
    "\n"
  );
}

function renderTeamHomeMember(siteData, memberId) {
  const member = getTeamMember(siteData, memberId);

  return [
    `<button type="button" class="team-home-member" data-member="${escapeAttribute(memberId)}">`,
    '    <span class="team-home-main">',
    `        <span class="team-home-name">${escapeHtml(member.name)}</span>`,
    `        <span class="team-home-title">${escapeHtml(member.title)}</span>`,
    "    </span>",
    `    <img src="${escapeAttribute(member.photo)}" alt="${escapeAttribute(member.name)}" class="team-hover-img">`,
    "</button>",
  ].join("\n");
}

function renderAgentTeamList(siteData) {
  const rows = siteData.teamOrder.agent.map((memberId) =>
    indent(renderAgentTeamRow(siteData, memberId), 20)
  );

  return ['                <div class="agent-team-list">', ...rows, "                </div>"].join(
    "\n"
  );
}

function renderAgentTeamRow(siteData, memberId) {
  const member = getTeamMember(siteData, memberId);

  return [
    '<div class="agent-team-row">',
    `    <span class="atr-name">${escapeHtml(member.name)}</span>`,
    `    <span class="atr-role">${escapeHtml(member.title)}</span>`,
    "</div>",
  ].join("\n");
}

function renderAgentPortfolioList(siteData) {
  const rows = siteData.portfolioOrder.agent.map((companyId) =>
    indent(renderAgentPortfolioRow(siteData, companyId), 20)
  );

  return [
    '                <div class="agent-portfolio-list">',
    ...rows,
    "                </div>",
  ].join("\n");
}

function renderAgentPortfolioRow(siteData, companyId) {
  const company = getPortfolioCompany(siteData, companyId);

  return [
    '<div class="agent-portfolio-row">',
    `    <span class="apr-name">${escapeHtml(company.name)}</span>`,
    `    <span class="apr-desc">${escapeHtml(getAgentDescription(company))}</span>`,
    "</div>",
  ].join("\n");
}

function renderHomeMemberData(siteData) {
  const objectSource = `const homeMemberData = ${JSON.stringify(
    siteData.teamMembers,
    null,
    4
  )};`;
  return indent(objectSource, 8);
}

function renderSkillTeamTable(siteData) {
  const rows = siteData.teamOrder.agent.map((memberId) => {
    const member = getTeamMember(siteData, memberId);
    return `| ${escapeMarkdown(member.name)} | ${escapeMarkdown(member.title)} | ${escapeMarkdown(member.skillDescription || "")} |`;
  });

  return [
    "| Name | Title | Reach out about |",
    "|------|-------|-----------------|",
    ...rows,
    "",
  ].join("\n");
}

function renderSkillPortfolioTable(siteData) {
  const rows = siteData.portfolioOrder.agent.map((companyId) => {
    const company = getPortfolioCompany(siteData, companyId);
    const status = company.badge ? escapeMarkdown(company.badge.text) : "Active";
    return `| ${escapeMarkdown(company.name)} | ${escapeMarkdown(
      getAgentDescription(company)
    )} | ${status} |`;
  });

  return [
    "| Company | Description | Status |",
    "|---------|-------------|--------|",
    ...rows,
    "",
  ].join("\n");
}

function renderCompanyName(company) {
  if (!company.badge) {
    return escapeHtml(company.name);
  }

  const className = escapeAttribute(company.badge.className || "");
  const badgeClass = className ? ` class="company-badge ${className}"` : ' class="company-badge"';
  return `${escapeHtml(company.name)} <span${badgeClass}>${escapeHtml(company.badge.text)}</span>`;
}

function getAgentDescription(company) {
  return company.agentDescription || company.description;
}

function getTeamMember(siteData, memberId) {
  const member = siteData.teamMembers[memberId];
  if (!member) {
    throw new Error(`Unknown team member id: ${memberId}`);
  }
  return member;
}

function getPortfolioCompany(siteData, companyId) {
  const company = siteData.portfolioCompanies[companyId];
  if (!company) {
    throw new Error(`Unknown portfolio company id: ${companyId}`);
  }
  return company;
}

function replaceBlock({ source, label, blockType, fallbackPattern, content }) {
  const markers = getMarkers(label, blockType);
  const wrappedContent = `${markers.start}\n${content}\n${markers.end}`;
  const markerPattern = new RegExp(
    `${escapeRegExp(markers.start)}[\\s\\S]*?${escapeRegExp(markers.end)}`
  );

  if (markerPattern.test(source)) {
    return source.replace(markerPattern, wrappedContent);
  }

  if (!fallbackPattern.test(source)) {
    throw new Error(`Could not find block "${label}" to replace.`);
  }

  return source.replace(fallbackPattern, wrappedContent);
}

function replacePattern(source, pattern, content) {
  if (!pattern.test(source)) {
    throw new Error(`Could not find pattern to replace: ${pattern}`);
  }
  return source.replace(pattern, content);
}

function getMarkers(label, blockType) {
  if (blockType === "js") {
    return {
      start: `        // GENERATED: ${label}:start`,
      end: `        // GENERATED: ${label}:end`,
    };
  }

  if (blockType === "md") {
    return {
      start: `<!-- GENERATED: ${label}:start -->`,
      end: `<!-- GENERATED: ${label}:end -->`,
    };
  }

  return {
    start: `        <!-- GENERATED: ${label}:start -->`,
    end: `        <!-- GENERATED: ${label}:end -->`,
  };
}

function validateData(siteData) {
  validateOrder(siteData.teamOrder.home, siteData.teamMembers, "teamOrder.home");
  validateOrder(siteData.teamOrder.agent, siteData.teamMembers, "teamOrder.agent");
  validateOrder(
    siteData.portfolioOrder.human,
    siteData.portfolioCompanies,
    "portfolioOrder.human"
  );
  validateOrder(
    siteData.portfolioOrder.agent,
    siteData.portfolioCompanies,
    "portfolioOrder.agent"
  );

  if (siteData.homeFeaturedCompanyCount < 0) {
    throw new Error("homeFeaturedCompanyCount must be zero or greater.");
  }

  if (siteData.homeFeaturedCompanyCount > siteData.portfolioOrder.human.length) {
    throw new Error("homeFeaturedCompanyCount exceeds the human portfolio order length.");
  }
}

function validateOrder(order, records, label) {
  const seen = new Set();

  for (const id of order) {
    if (seen.has(id)) {
      throw new Error(`Duplicate id "${id}" found in ${label}.`);
    }
    if (!records[id]) {
      throw new Error(`Unknown id "${id}" found in ${label}.`);
    }
    seen.add(id);
  }
}

function writeIfChanged(filePath, nextSource) {
  const previousSource = fs.readFileSync(filePath, "utf8");
  if (previousSource === nextSource) {
    return;
  }
  fs.writeFileSync(filePath, nextSource);
}

function indent(value, spaces) {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

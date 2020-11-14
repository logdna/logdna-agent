# typed: false
# frozen_string_literal: true

cask "logdna-agent" do
  version "2.1.2"
  sha256 "b5c44e27cd6f4a92ff2eb12be09ff0be7e8a56309db33c139db42f5110a037fb"

  # github.com/logdna/logdna-agent/ was verified as official when first introduced to the cask
  url "https://github.com/logdna/logdna-agent/releases/download/#{version}/logdna-agent-#{version}.pkg"
  appcast "https://github.com/logdna/logdna-agent/releases.atom"
  name "LogDNA Agent"
  desc "Agent streams from log files to your LogDNA account"
  homepage "https://logdna.com/"

  pkg "logdna-agent-#{version}.pkg"

  uninstall pkgutil:   "com.logdna.logdna-agent",
            launchctl: "com.logdna.logdna-agentd"

  caveats <<~EOS
    When you first start logdna-agent, you must set your LogDNA Ingestion Key with the command:
      sudo logdna-agent -k <ingestion-key>

    To always run logdna-agent in the background, use the command:
      sudo launchctl load -w /Library/LaunchDaemons/com.logdna.logdna-agent.plist
  EOS
end

#!/usr/bin/env ruby
require 'xcodeproj'

destination = ARGV.fetch(0)
raise 'Use an isolated output directory' if File.exist?(destination)
project = Xcodeproj::Project.new(destination)
target = project.new_target(:ui_test_bundle, 'MatchrimCandidateUITests', :ios, '18.0')
source = File.expand_path('../qa/ios/MatchrimCandidateUITests.swift', __dir__)
reference = project.main_group.new_file(source)
target.source_build_phase.add_file_reference(reference)
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'wine.matchrim.build61.blackbox.uitests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'CODE_SIGN_STYLE' => 'Automatic',
    'DEVELOPMENT_TEAM' => ENV.fetch('MATCHRIM_DEVELOPMENT_TEAM', '8X3XTD6XYX'),
    'TARGETED_DEVICE_FAMILY' => '1,2'
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.test_action.xml_element.elements['Testables/TestableReference'].attributes['useUITargetAppProvidedByTests'] = 'YES'
scheme.save_as(destination, 'MatchrimCandidateQA')
puts destination

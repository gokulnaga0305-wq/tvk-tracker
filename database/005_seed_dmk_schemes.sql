-- DMK-era schemes registry — used by AI prompt to detect TVK credit-stealing.
-- Each row catalogs a major initiative launched/operationalised by the DMK
-- government (2021-2026) under CM M.K. Stalin. If TVK announces something
-- matching name/alias, that's a candidate credit-steal incident.

insert into dmk_schemes (name, aliases, launch_date, description, key_features, beneficiaries_count) values

-- ============ Women & social welfare ============
('Kalaignar Magalir Urimai Thittam',
 ARRAY['Magalir Urimai', 'KMUT', 'Women monthly Rs 1000', 'Magalir Urimai Thogai'],
 '2023-09-15',
 'Monthly Rs 1000 cash transfer to women heads of households.',
 'Launched by CM Stalin in Sept 2023. Direct benefit transfer (DBT). Initial outlay ~Rs 7000 crore/year.',
 '1.06 crore women beneficiaries enrolled by 2024'),

('Pudhumai Penn Thittam',
 ARRAY['Pudhumai Penn', 'New Girls Scheme', 'Girls free college'],
 '2022-09-05',
 'Rs 1000/month stipend for girls from govt schools pursuing higher education.',
 'Aims to prevent dropout post Class 12. Direct transfer until graduation.',
 '~3 lakh students enrolled'),

('Magalir Free Bus Pass',
 ARRAY['Free bus for women', 'Magalir Free Pass', 'Pengal free bus', 'Women free travel'],
 '2021-05-22',
 'Free travel for women in town and ordinary buses across Tamil Nadu.',
 'Rolled out within first month of DMK govt. Saves Rs 800-1500/month per woman.',
 '~1.2 crore women travel free daily'),

('Innuyir Kaapom-Nammai Kaakkum 48',
 ARRAY['48-hour emergency care', 'Free ICU 48 hours', 'Nammai Kaakkum 48'],
 '2022-11-01',
 'Free first 48-hour emergency/ICU care in private hospitals statewide.',
 'Govt pays private hospitals for life-threatening cases. Stabilizes patient before transfer.',
 '~5 lakh+ patients benefited'),

('Chief Minister Breakfast Scheme',
 ARRAY['CM Breakfast', 'School breakfast scheme', 'Free morning meal'],
 '2022-09-15',
 'Free breakfast for govt school students (initially Classes 1-5, expanded).',
 'Pilot in 1,545 schools, scaled statewide. Combats malnutrition.',
 '~17 lakh students daily'),

-- ============ Electricity / utility ============
('Free Electricity 100 units (later 200)',
 ARRAY['free electricity', '100 units free', '200 units free', 'free power'],
 '2021-09-01',
 'Domestic consumers exempt from charges up to 100 units bi-monthly (raised to 200 in 2023).',
 'Stalin govt raised free quota from 100 to 200 units. Estimated savings Rs 1000+/family/year.',
 '~2.5 crore households'),

('TANGEDCO Smart Meter rollout',
 ARRAY['smart meter', 'TANGEDCO meter', 'smart electricity'],
 '2023-01-01',
 'Phased smart-meter rollout across TN for transparent billing.',
 'Reduces meter-reading errors, enables outage detection.',
 'Phase 1: ~30 lakh meters'),

-- ============ Infrastructure ============
('Chennai Metro Phase 2',
 ARRAY['CMRL Phase 2', 'Metro extension', 'Phase 2 metro'],
 '2021-11-15',
 'Rs 61,843 crore Chennai Metro Rail Phase 2 — three new corridors, 118.9 km.',
 'DMK govt obtained central sanction. Construction underway across all corridors.',
 'Will serve ~13 lakh daily commuters by 2028'),

('AIIMS Madurai',
 ARRAY['AIIMS Madurai', 'Madurai AIIMS'],
 '2024-08-12',
 'AIIMS Madurai foundation laid; land acquired in Thoppur.',
 'Stalin govt completed land acquisition. Central institution but state-driven.',
 '750-bed hospital'),

('Chennai Outer Ring Road Phase 2',
 ARRAY['ORR Phase 2', 'Chennai ORR'],
 '2023-03-01',
 'Phase 2 extension of Chennai Outer Ring Road by NHAI/State.',
 'Decongests city; connects industrial corridor.',
 NULL),

-- ============ Industrial investment ============
('Foxconn iPhone manufacturing expansion',
 ARRAY['Foxconn', 'Foxconn TN', 'iPhone TN', 'Foxconn Sriperumbudur'],
 '2022-07-01',
 'Foxconn India facility expansion in Sriperumbudur for iPhone manufacturing.',
 'DMK govt facilitated land, power, labour. Now exports iPhones globally.',
 '~50,000 jobs (mostly women)'),

('Pegatron iPhone facility',
 ARRAY['Pegatron', 'Pegatron Chennai'],
 '2022-04-01',
 'Pegatron iPhone manufacturing facility in Mahindra World City.',
 'Operational under DMK govt. Apple''s 2nd India contract manufacturer.',
 '~14,000 jobs'),

('Tamil Nadu Global Investors Meet 2024',
 ARRAY['Global Investors Meet', 'GIM 2024', 'TN Investment Summit'],
 '2024-01-07',
 'Tamil Nadu Global Investors Meet 2024 — Rs 6.64 lakh crore MoUs signed.',
 'Record investments. Stalin personally pitched to global firms.',
 'MoUs across 17 sectors'),

('Hosur Aerospace & Defense Hub',
 ARRAY['Hosur aerospace', 'Hosur defense'],
 '2023-06-01',
 'Hosur aerospace and defense manufacturing hub development.',
 'TIDCO and TIDEL park investments. Tata Boeing, others.',
 NULL),

-- ============ Tamil culture / language ============
('Tamilukku Amudhendru Per',
 ARRAY['Tamil language scheme', 'Tamilukku Amudhendru'],
 '2022-01-25',
 'Tamil language promotion across govt, signage, education.',
 'Bilingual govt documents, Tamil computing initiatives, Tamil pride preservation.',
 NULL),

('Periyar International Conference',
 ARRAY['Periyar conference', 'Self-respect conference'],
 '2023-09-17',
 'International conference on Periyar and Dravidian self-respect movement.',
 'Affirmed Dravidian ideological foundations of TN governance.',
 NULL),

-- ============ Education ============
('Naan Mudhalvan',
 ARRAY['Naan Mudhalvan', 'I am the first'],
 '2022-03-12',
 'Comprehensive skill development & employability programme for students.',
 'Skill mapping, certified training, placement assistance, foreign internships.',
 '~30 lakh students enrolled'),

('Illam Thedi Kalvi',
 ARRAY['Illam Thedi Kalvi', 'home learning'],
 '2021-10-22',
 'After-school home-based education volunteer programme post-COVID.',
 'Addressed learning loss during pandemic. Volunteer teachers visit children.',
 '~30 lakh children helped'),

('Mission Schools of Excellence',
 ARRAY['Mission Schools', 'Schools of Excellence'],
 '2023-05-01',
 'Upgradation of govt schools to "Schools of Excellence" with smart classrooms, labs.',
 'Initial cohort: 386 schools. Modernised infrastructure.',
 '386 schools Phase 1'),

-- ============ Women safety / police ============
('Magalir Urimai Pengal Pengal Tamilakam',
 ARRAY['Pengal Pengal Tamilakam', 'Women safety initiatives'],
 '2023-03-08',
 'Women safety package: more women police, helplines, fast-track courts.',
 'Hike in women police strength, dedicated POCSO/POSH cells.',
 NULL),

-- ============ Welfare / annual ============
('Pongal Gift Hamper',
 ARRAY['Pongal hamper', 'Pongal kit', 'Pongal gift', 'Pongal Rs 1000'],
 '2022-01-13',
 'Annual Pongal gift hamper + Rs 1000 cash to family card holders.',
 'Continued DMK welfare tradition. Includes rice, dhal, sugar, sugarcane.',
 '~2.16 crore family cards'),

('Mudhalvarin Pasumaipan Thittam',
 ARRAY['Green Tamil Nadu', 'Greening mission', 'Pasumaipan'],
 '2023-07-01',
 'Tree-planting and ecosystem restoration mission across TN.',
 'Target: increase green cover from 23.5% to 33%.',
 'Crores of saplings planted')

on conflict do nothing;

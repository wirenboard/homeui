// TODO: <DISABLED_MODE> - need uncomment for Mode activation in WEBUI

// import { modes } from '@/stores/alice';
//
// {capability.type === Capability.Mode && (
//   <>
//     <div>
//       <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode-type')}</div>
//       <Dropdown
//         value={capability.parameters?.instance}
//         options={modes.map((mode) => ({ label: mode, value: mode }))}
//         onChange={({ value: instance }: Option<string>) => {
//           const val = capabilities.map((item, i) => i === key
//             ? { ...item, parameters: { ...item.parameters, instance } }
//             : item);
//           onCapabilityChange(val);
//         }}
//       />
//     </div>
//     <div>
//       <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode')}</div>
//       <Input
//         value={capability.parameters?.modes}
//         isFullWidth
//         onChange={(modes: string) => {
//           const val = capabilities.map((item, i) => i === key
//             ? { ...item, parameters: { ...item.parameters, modes } }
//             : item);
//           onCapabilityChange(val);
//         }}
//       />
//     </div>
//   </>
// )}

export {};

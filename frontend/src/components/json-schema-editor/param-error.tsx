interface ParamErrorProps {
  id?: string;
  msg?: string;
}

export const ParamError = ({ id, msg }: ParamErrorProps) => {
  if (msg) {
    return <p id={id} className="wb-jsonEditor-errorText">{msg}</p>;
  }
  return null;
};

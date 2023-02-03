import React from 'react';
import { Switcher } from "./editorStore";
import { observer } from "mobx-react-lite";
import { BootstrapRow, Button } from "../common";

const SwitcherElement = observer(({switcher, elem, column, left, right}) => {
  let buttons = new Array();

  if (left !== null) {
    const leftOnClick = e => {
      e.preventDefault()
      switcher.moveConnection(elem, column, left);
    }
    buttons.push((
      <Button onClick={leftOnClick} icon="glyphicon glyphicon-arrow-left" />
    ))
  }
  if (right !== null) {
    const rightOnClick = e => {
      e.preventDefault()
      switcher.moveConnection(elem, column, right);
    }
    buttons.push((
      <Button onClick={rightOnClick} icon="glyphicon glyphicon-arrow-right" />
    ))
  }

  return (
    <li className="list-group-item clearfix">
      <span>{elem.name}</span>
      <div className="btn-group pull-right" role="group" aria-label="move connection">
        {buttons}
      </div>
    </li>
  )
});

function makeSwitcherList(switcher, column, left, right) {
  return column.map(element => {
    return (
      <SwitcherElement switcher={switcher} elem={element} column={column} left={left} right={right} />
    );
  });
}

const SwitcherColumn = observer(({switcher, name, column, left, right}) => {
  return (
    <div className="col-md-4">
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">{name}</h3>
        </div>
        <ul className="list-group">
          {makeSwitcherList(switcher, column, left, right)}
        </ul>
      </div>
    </div>
  );
});

export const SwitcherForm = ({switcher}) => {
  return (
    <>
    <h2>Connection priorities</h2>
    <div className="row col-md-10 well well-small">
      <p>Move connections left or right to increase or decrease its priority</p>
      <SwitcherColumn switcher={switcher} name="High" column={switcher.connectionsHigh} left={null} right={switcher.connectionsMed} />
      <SwitcherColumn switcher={switcher} name="Medium" column={switcher.connectionsMed} left={switcher.connectionsHigh} right={switcher.connectionsLow} />
      <SwitcherColumn switcher={switcher} name="Low" column={switcher.connectionsLow} left={switcher.connectionsMed} right={null} />
    </div>
    </>
  );
};

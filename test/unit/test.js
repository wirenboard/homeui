describe("sorting the list of users", () => {

  it('sorts in descending order by default', () => {

    var users = ['jack', 'igor', 'jeff'];
    var sorted = users.sort();
    sorted = sorted.reverse();
    expect(sorted).toEqual(['jeff', 'jack', 'igor']);

  });
});
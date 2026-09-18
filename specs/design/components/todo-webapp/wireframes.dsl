screen TodoList "Add a todo and track what's done"
  navbar "Todo"
  heading "My Todos"
  row
    input "What needs doing?"
    button "Add" primary // adds to the list below, stays on this screen
  card "Todo"
    row
      checkbox "Buy groceries"
      badge "Pending" warning
  card "Todo"
    row
      checkbox "Call the dentist" active
      badge "Done" success

flow "Manage todos"
  role "User"
  description "A signed-in user adds a todo and marks one done"
  TodoList

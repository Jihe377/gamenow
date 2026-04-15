# ── REST API Gateway ─────────────────────────────────────────────────────────

resource "aws_api_gateway_rest_api" "rest" {
  name = "${var.project}-rest-api"
  tags = { Project = var.project }
}

# /rooms resource
resource "aws_api_gateway_resource" "rooms" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_rest_api.rest.root_resource_id
  path_part   = "rooms"
}

# POST /rooms
resource "aws_api_gateway_method" "post_rooms" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.rooms.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_rooms" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.rooms.id
  http_method             = aws_api_gateway_method.post_rooms.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.room_service.invoke_arn
}

resource "aws_api_gateway_method" "options_rooms" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.rooms.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_rooms" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.rooms.id
  http_method = aws_api_gateway_method.options_rooms.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_rooms" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.rooms.id
  http_method = aws_api_gateway_method.options_rooms.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_rooms" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.rooms.id
  http_method = aws_api_gateway_method.options_rooms.http_method
  status_code = aws_api_gateway_method_response.options_rooms.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# /rooms/{roomId}
resource "aws_api_gateway_resource" "room_id" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.rooms.id
  path_part   = "{roomId}"
}

# GET /rooms/{roomId}
resource "aws_api_gateway_method" "get_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.room_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_room" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.room_id.id
  http_method             = aws_api_gateway_method.get_room.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.room_service.invoke_arn
}

resource "aws_api_gateway_method" "options_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.room_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.room_id.id
  http_method = aws_api_gateway_method.options_room.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.room_id.id
  http_method = aws_api_gateway_method.options_room.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.room_id.id
  http_method = aws_api_gateway_method.options_room.http_method
  status_code = aws_api_gateway_method_response.options_room.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# /rooms/{roomId}/join
resource "aws_api_gateway_resource" "join" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.room_id.id
  path_part   = "join"
}

resource "aws_api_gateway_resource" "leave" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.room_id.id
  path_part   = "leave"
}

resource "aws_api_gateway_resource" "start" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.room_id.id
  path_part   = "start"
}

resource "aws_api_gateway_resource" "battleship" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_rest_api.rest.root_resource_id
  path_part   = "battleship"
}

resource "aws_api_gateway_resource" "battleship_room_id" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.battleship.id
  path_part   = "{roomId}"
}

resource "aws_api_gateway_resource" "battleship_setup" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.battleship_room_id.id
  path_part   = "setup"
}

resource "aws_api_gateway_resource" "battleship_fire" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.battleship_room_id.id
  path_part   = "fire"
}

resource "aws_api_gateway_resource" "battleship_forfeit" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  parent_id   = aws_api_gateway_resource.battleship_room_id.id
  path_part   = "forfeit"
}

# POST /rooms/{roomId}/join
resource "aws_api_gateway_method" "join_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.join.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "join_room" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.join.id
  http_method             = aws_api_gateway_method.join_room.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.room_service.invoke_arn
}

resource "aws_api_gateway_method" "leave_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.leave.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "leave_room" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.leave.id
  http_method             = aws_api_gateway_method.leave_room.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.room_service.invoke_arn
}

resource "aws_api_gateway_method" "start_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.start.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "start_room" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.start.id
  http_method             = aws_api_gateway_method.start_room.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.room_service.invoke_arn
}

resource "aws_api_gateway_method" "get_battleship_state" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_room_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_battleship_state" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.battleship_room_id.id
  http_method             = aws_api_gateway_method.get_battleship_state.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.battleship_service.invoke_arn
}

resource "aws_api_gateway_method" "post_battleship_setup" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_setup.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_battleship_setup" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.battleship_setup.id
  http_method             = aws_api_gateway_method.post_battleship_setup.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.battleship_service.invoke_arn
}

resource "aws_api_gateway_method" "post_battleship_fire" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_fire.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_battleship_fire" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.battleship_fire.id
  http_method             = aws_api_gateway_method.post_battleship_fire.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.battleship_service.invoke_arn
}

# POST /battleship/{roomId}/forfeit
resource "aws_api_gateway_method" "post_battleship_forfeit" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_forfeit.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_battleship_forfeit" {
  rest_api_id             = aws_api_gateway_rest_api.rest.id
  resource_id             = aws_api_gateway_resource.battleship_forfeit.id
  http_method             = aws_api_gateway_method.post_battleship_forfeit.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.battleship_service.invoke_arn
}

resource "aws_api_gateway_method" "options_battleship_forfeit" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_forfeit.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_battleship_forfeit" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_forfeit.id
  http_method = aws_api_gateway_method.options_battleship_forfeit.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_battleship_forfeit" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_forfeit.id
  http_method = aws_api_gateway_method.options_battleship_forfeit.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_battleship_forfeit" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_forfeit.id
  http_method = aws_api_gateway_method.options_battleship_forfeit.http_method
  status_code = aws_api_gateway_method_response.options_battleship_forfeit.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "options_join_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.join.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_join_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.join.id
  http_method = aws_api_gateway_method.options_join_room.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_join_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.join.id
  http_method = aws_api_gateway_method.options_join_room.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_join_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.join.id
  http_method = aws_api_gateway_method.options_join_room.http_method
  status_code = aws_api_gateway_method_response.options_join_room.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "options_leave_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.leave.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_leave_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.leave.id
  http_method = aws_api_gateway_method.options_leave_room.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_leave_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.leave.id
  http_method = aws_api_gateway_method.options_leave_room.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_leave_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.leave.id
  http_method = aws_api_gateway_method.options_leave_room.http_method
  status_code = aws_api_gateway_method_response.options_leave_room.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "options_start_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.start.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_start_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.start.id
  http_method = aws_api_gateway_method.options_start_room.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_start_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.start.id
  http_method = aws_api_gateway_method.options_start_room.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_start_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.start.id
  http_method = aws_api_gateway_method.options_start_room.http_method
  status_code = aws_api_gateway_method_response.options_start_room.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "options_battleship_room" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_room_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_battleship_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_room_id.id
  http_method = aws_api_gateway_method.options_battleship_room.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_battleship_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_room_id.id
  http_method = aws_api_gateway_method.options_battleship_room.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_battleship_room" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_room_id.id
  http_method = aws_api_gateway_method.options_battleship_room.http_method
  status_code = aws_api_gateway_method_response.options_battleship_room.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "options_battleship_setup" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_setup.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_battleship_setup" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_setup.id
  http_method = aws_api_gateway_method.options_battleship_setup.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_battleship_setup" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_setup.id
  http_method = aws_api_gateway_method.options_battleship_setup.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_battleship_setup" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_setup.id
  http_method = aws_api_gateway_method.options_battleship_setup.http_method
  status_code = aws_api_gateway_method_response.options_battleship_setup.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "options_battleship_fire" {
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  resource_id   = aws_api_gateway_resource.battleship_fire.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_battleship_fire" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_fire.id
  http_method = aws_api_gateway_method.options_battleship_fire.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_battleship_fire" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_fire.id
  http_method = aws_api_gateway_method.options_battleship_fire.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_battleship_fire" {
  rest_api_id = aws_api_gateway_rest_api.rest.id
  resource_id = aws_api_gateway_resource.battleship_fire.id
  http_method = aws_api_gateway_method.options_battleship_fire.http_method
  status_code = aws_api_gateway_method_response.options_battleship_fire.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Lambda permissions for REST API
resource "aws_lambda_permission" "rest_room_service" {
  statement_id  = "AllowRestAPIInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.room_service.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.rest.execution_arn}/*/*"
}

resource "aws_lambda_permission" "rest_battleship_service" {
  statement_id  = "AllowRestBattleshipAPIInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.battleship_service.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.rest.execution_arn}/*/*"
}

# Deployment
resource "aws_api_gateway_deployment" "rest" {
  rest_api_id = aws_api_gateway_rest_api.rest.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.post_rooms.id,
      aws_api_gateway_integration.get_room.id,
      aws_api_gateway_integration.join_room.id,
      aws_api_gateway_integration.leave_room.id,
      aws_api_gateway_integration.start_room.id,
      aws_api_gateway_integration.get_battleship_state.id,
      aws_api_gateway_integration.post_battleship_setup.id,
      aws_api_gateway_integration.post_battleship_fire.id,
      aws_api_gateway_integration.post_battleship_forfeit.id,
      aws_api_gateway_integration_response.options_rooms.id,
      aws_api_gateway_integration_response.options_room.id,
      aws_api_gateway_integration_response.options_join_room.id,
      aws_api_gateway_integration_response.options_leave_room.id,
      aws_api_gateway_integration_response.options_start_room.id,
      aws_api_gateway_integration_response.options_battleship_room.id,
      aws_api_gateway_integration_response.options_battleship_setup.id,
      aws_api_gateway_integration_response.options_battleship_fire.id,
      aws_api_gateway_integration_response.options_battleship_forfeit.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.post_rooms,
    aws_api_gateway_integration.get_room,
    aws_api_gateway_integration.join_room,
    aws_api_gateway_integration.leave_room,
    aws_api_gateway_integration.start_room,
    aws_api_gateway_integration.get_battleship_state,
    aws_api_gateway_integration.post_battleship_setup,
    aws_api_gateway_integration.post_battleship_fire,
    aws_api_gateway_integration.post_battleship_forfeit,
    aws_api_gateway_integration_response.options_rooms,
    aws_api_gateway_integration_response.options_room,
    aws_api_gateway_integration_response.options_join_room,
    aws_api_gateway_integration_response.options_leave_room,
    aws_api_gateway_integration_response.options_start_room,
    aws_api_gateway_integration_response.options_battleship_room,
    aws_api_gateway_integration_response.options_battleship_setup,
    aws_api_gateway_integration_response.options_battleship_fire,
    aws_api_gateway_integration_response.options_battleship_forfeit,
  ]
}

resource "aws_api_gateway_stage" "rest" {
  deployment_id = aws_api_gateway_deployment.rest.id
  rest_api_id   = aws_api_gateway_rest_api.rest.id
  stage_name    = "prod"
}

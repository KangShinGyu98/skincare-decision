locals {
  vpc_id = "vpc-0f2309e82c378ddb5"
}

module "fck-nat-2a" {
  source    = "git::https://github.com/RaJiska/terraform-aws-fck-nat.git"
  name      = "fck-nat-2a"
  vpc_id    = local.vpc_id
  subnet_id = "subnet-07b7ce7e6f69cc37b"

  update_route_tables = true
  route_tables_ids = {
    "private-2a" = "rtb-099bd0e0f51b4daec"
  }
}

module "fck-nat-2b" {
  source    = "git::https://github.com/RaJiska/terraform-aws-fck-nat.git"
  name      = "fck-nat-2b"
  vpc_id    = local.vpc_id
  subnet_id = "subnet-0937b534ff64ae529"

  update_route_tables = true
  route_tables_ids = {
    "private-2b" = "rtb-0fb6919f41b1df424"
  }
}